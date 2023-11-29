"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Light = void 0;
const undici_1 = require("undici");
const settings_1 = require("../settings");
/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
class Light {
    constructor(platform, accessory, device) {
        this.platform = platform;
        this.accessory = accessory;
        this.device = device;
        // default placeholders
        this.logs(device);
        this.context();
        this.disablePushOnChanges(device);
        this.disablePushOffChanges(device);
        this.config(device);
        // set accessory information
        accessory
            .getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'SwitchBot')
            .setCharacteristic(this.platform.Characteristic.Model, device.remoteType)
            .setCharacteristic(this.platform.Characteristic.SerialNumber, device.deviceId)
            .setCharacteristic(this.platform.Characteristic.FirmwareRevision, accessory.context.FirmwareRevision);
        if (!device.irlight?.stateless) {
            // get the Light service if it exists, otherwise create a new Light service
            // you can create multiple services for each accessory
            const lightBulbService = `${accessory.displayName} ${device.remoteType}`;
            (this.lightBulbService = accessory.getService(this.platform.Service.Lightbulb)
                || accessory.addService(this.platform.Service.Lightbulb)), lightBulbService;
            this.lightBulbService.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);
            if (!this.lightBulbService.testCharacteristic(this.platform.Characteristic.ConfiguredName)) {
                this.lightBulbService.addCharacteristic(this.platform.Characteristic.ConfiguredName, accessory.displayName);
            }
            // handle on / off events using the On characteristic
            this.lightBulbService.getCharacteristic(this.platform.Characteristic.On).onSet(this.OnSet.bind(this));
        }
        else {
            // create a new Stateful Programmable Switch On service
            const ProgrammableSwitchServiceOn = `${accessory.displayName} ${device.remoteType} On`;
            (this.ProgrammableSwitchServiceOn = accessory.getService(this.platform.Service.StatefulProgrammableSwitch)
                || accessory.addService(this.platform.Service.StatefulProgrammableSwitch)), ProgrammableSwitchServiceOn;
            this.ProgrammableSwitchServiceOn.setCharacteristic(this.platform.Characteristic.Name, `${accessory.displayName} On`);
            if (!this.ProgrammableSwitchServiceOn.testCharacteristic(this.platform.Characteristic.ConfiguredName)) {
                this.ProgrammableSwitchServiceOn.addCharacteristic(this.platform.Characteristic.ConfiguredName, `${accessory.displayName} On`);
            }
            this.ProgrammableSwitchServiceOn.getCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent).setProps({
                validValueRanges: [0, 0],
                minValue: 0,
                maxValue: 0,
                validValues: [0],
            })
                .onGet(() => {
                return this.ProgrammableSwitchEventOn;
            });
            this.ProgrammableSwitchServiceOn.getCharacteristic(this.platform.Characteristic.ProgrammableSwitchOutputState)
                .onSet(this.ProgrammableSwitchOutputStateSetOn.bind(this));
            // create a new Stateful Programmable Switch Off service
            const ProgrammableSwitchServiceOff = `${accessory.displayName} ${device.remoteType} Off`;
            (this.ProgrammableSwitchServiceOff = accessory.getService(this.platform.Service.StatefulProgrammableSwitch)
                || accessory.addService(this.platform.Service.StatefulProgrammableSwitch)), ProgrammableSwitchServiceOff;
            this.ProgrammableSwitchServiceOff.setCharacteristic(this.platform.Characteristic.Name, `${accessory.displayName} Off`);
            if (!this.ProgrammableSwitchServiceOff.testCharacteristic(this.platform.Characteristic.ConfiguredName)) {
                this.ProgrammableSwitchServiceOff.addCharacteristic(this.platform.Characteristic.ConfiguredName, `${accessory.displayName} Off`);
            }
            this.ProgrammableSwitchServiceOff.getCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent).setProps({
                validValueRanges: [0, 0],
                minValue: 0,
                maxValue: 0,
                validValues: [0],
            })
                .onGet(() => {
                return this.ProgrammableSwitchEventOff;
            });
            this.ProgrammableSwitchServiceOff.getCharacteristic(this.platform.Characteristic.ProgrammableSwitchOutputState)
                .onSet(this.ProgrammableSwitchOutputStateSetOff.bind(this));
        }
    }
    async OnSet(value) {
        this.debugLog(`${this.device.remoteType}: ${this.accessory.displayName} On: ${value}`);
        this.On = value;
        if (this.On) {
            await this.pushLightOnChanges();
        }
        else {
            await this.pushLightOffChanges();
        }
        /**
         * pushLightOnChanges and pushLightOffChanges above assume they are measuring the state of the accessory BEFORE
         * they are updated, so we are only updating the accessory state after calling the above.
         */
    }
    async ProgrammableSwitchOutputStateSetOn(value) {
        this.debugLog(`${this.device.remoteType}: ${this.accessory.displayName} On: ${value}`);
        this.ProgrammableSwitchOutputStateOn = value;
        if (this.ProgrammableSwitchOutputStateOn === 1) {
            this.On = true;
            await this.pushLightOnChanges();
        }
        /**
         * pushLightOnChanges and pushLightOffChanges above assume they are measuring the state of the accessory BEFORE
         * they are updated, so we are only updating the accessory state after calling the above.
         */
    }
    async ProgrammableSwitchOutputStateSetOff(value) {
        this.debugLog(`${this.device.remoteType}: ${this.accessory.displayName} On: ${value}`);
        this.ProgrammableSwitchOutputStateOff = value;
        if (this.ProgrammableSwitchOutputStateOff === 1) {
            this.On = false;
            await this.pushLightOffChanges();
        }
        /**
         * pushLightOnChanges and pushLightOffChanges above assume they are measuring the state of the accessory BEFORE
         * they are updated, so we are only updating the accessory state after calling the above.
         */
    }
    /**
     * Pushes the requested changes to the SwitchBot API
     * deviceType	commandType     Command	          command parameter	         Description
     * Light -        "command"       "turnOff"         "default"	        =        set to OFF state
     * Light -       "command"       "turnOn"          "default"	        =        set to ON state
     * Light -       "command"       "volumeAdd"       "default"	        =        volume up
     * Light -       "command"       "volumeSub"       "default"	        =        volume down
     * Light -       "command"       "channelAdd"      "default"	        =        next channel
     * Light -       "command"       "channelSub"      "default"	        =        previous channel
     */
    async pushLightOnChanges() {
        this.debugLog(`${this.device.remoteType}: ${this.accessory.displayName} pushLightOnChanges On: ${this.On},` + ` disablePushOn: ${this.disablePushOn}`);
        if (this.On && !this.disablePushOn) {
            const commandType = await this.commandType();
            const command = await this.commandOn();
            const bodyChange = JSON.stringify({
                command: command,
                parameter: 'default',
                commandType: commandType,
            });
            await this.pushChanges(bodyChange);
        }
    }
    async pushLightOffChanges() {
        this.debugLog(`${this.device.remoteType}: ${this.accessory.displayName} pushLightOffChanges On: ${this.On},` + ` disablePushOff: ${this.disablePushOff}`);
        if (!this.On && !this.disablePushOff) {
            const commandType = await this.commandType();
            const command = await this.commandOff();
            const bodyChange = JSON.stringify({
                command: command,
                parameter: 'default',
                commandType: commandType,
            });
            await this.pushChanges(bodyChange);
        }
    }
    /*async pushLightBrightnessUpChanges(): Promise<void> {
      const bodyChange = JSON.stringify({
        command: 'brightnessUp',
        parameter: 'default',
        commandType: 'command',
      });
      await this.pushChanges(bodyChange);
    }
  
    async pushLightBrightnessDownChanges(): Promise<void> {
      const bodyChange = JSON.stringify({
        command: 'brightnessDown',
        parameter: 'default',
        commandType: 'command',
      });
      await this.pushChanges(bodyChange);
    }*/
    async pushChanges(bodyChange) {
        this.debugLog(`${this.device.remoteType}: ${this.accessory.displayName} pushChanges`);
        if (this.device.connectionType === 'OpenAPI') {
            this.infoLog(`${this.device.remoteType}: ${this.accessory.displayName} Sending request to SwitchBot API, body: ${bodyChange},`);
            try {
                const { body, statusCode, headers } = await (0, undici_1.request)(`${settings_1.Devices}/${this.device.deviceId}/commands`, {
                    body: bodyChange,
                    method: 'POST',
                    headers: this.platform.generateHeaders(),
                });
                this.debugWarnLog(`${this.device.remoteType}: ${this.accessory.displayName} body: ${JSON.stringify(body)}`);
                this.debugWarnLog(`${this.device.remoteType}: ${this.accessory.displayName} statusCode: ${statusCode}`);
                this.debugWarnLog(`${this.device.remoteType}: ${this.accessory.displayName} headers: ${JSON.stringify(headers)}`);
                const deviceStatus = await body.json();
                this.debugWarnLog(`${this.device.remoteType}: ${this.accessory.displayName} deviceStatus: ${JSON.stringify(deviceStatus)}`);
                this.debugWarnLog(`${this.device.remoteType}: ${this.accessory.displayName} deviceStatus body: ${JSON.stringify(deviceStatus.body)}`);
                this.debugWarnLog(`${this.device.remoteType}: ${this.accessory.displayName} deviceStatus statusCode: ${deviceStatus.statusCode}`);
                if ((statusCode === 200 || statusCode === 100) && (deviceStatus.statusCode === 200 || deviceStatus.statusCode === 100)) {
                    this.debugErrorLog(`${this.device.remoteType}: ${this.accessory.displayName} `
                        + `statusCode: ${statusCode} & deviceStatus StatusCode: ${deviceStatus.statusCode}`);
                    this.accessory.context.On = this.On;
                    this.updateHomeKitCharacteristics();
                }
                else {
                    this.statusCode(statusCode);
                    this.statusCode(deviceStatus.statusCode);
                }
            }
            catch (e) {
                this.apiError(e);
                this.errorLog(`${this.device.remoteType}: ${this.accessory.displayName} failed pushChanges with ${this.device.connectionType}` +
                    ` Connection, Error Message: ${JSON.stringify(e.message)}`);
            }
        }
        else {
            this.warnLog(`${this.device.remoteType}: ${this.accessory.displayName}` +
                ` Connection Type: ${this.device.connectionType}, commands will not be sent to OpenAPI`);
        }
    }
    async updateHomeKitCharacteristics() {
        if (this.device.irlight?.stateless) {
            // On
            if (this.On === undefined) {
                this.debugLog(`${this.device.remoteType}: ${this.accessory.displayName} On: ${this.On}`);
            }
            else {
                this.accessory.context.On = this.On;
                this.lightBulbService?.updateCharacteristic(this.platform.Characteristic.On, this.On);
                this.debugLog(`${this.device.remoteType}: ${this.accessory.displayName} updateCharacteristic On: ${this.On}`);
            }
        }
        else {
            // On Stateful Programmable Switch
            if (this.ProgrammableSwitchOutputStateOn === undefined) {
                this.debugLog(`${this.device.remoteType}: ${this.accessory.displayName}`
                    + ` ProgrammableSwitchOutputStateOn: ${this.ProgrammableSwitchOutputStateOn}`);
            }
            else {
                this.accessory.context.ProgrammableSwitchOutputStateOn = this.ProgrammableSwitchOutputStateOn;
                this.ProgrammableSwitchServiceOn?.updateCharacteristic(this.platform.Characteristic.ProgrammableSwitchOutputState, this.ProgrammableSwitchOutputStateOn);
                this.debugLog(`${this.device.remoteType}: ${this.accessory.displayName} updateCharacteristic`
                    + ` ProgrammableSwitchOutputStateOn: ${this.ProgrammableSwitchOutputStateOn}`);
            }
            // Off Stateful Programmable Switch
            if (this.ProgrammableSwitchOutputStateOff === undefined) {
                this.debugLog(`${this.device.remoteType}: ${this.accessory.displayName}`
                    + ` ProgrammableSwitchOutputStateOff: ${this.ProgrammableSwitchOutputStateOff}`);
            }
            else {
                this.accessory.context.ProgrammableSwitchOutputStateOff = this.ProgrammableSwitchOutputStateOff;
                this.ProgrammableSwitchServiceOff?.updateCharacteristic(this.platform.Characteristic.ProgrammableSwitchOutputState, this.ProgrammableSwitchOutputStateOff);
                this.debugLog(`${this.device.remoteType}: ${this.accessory.displayName} updateCharacteristic`
                    + ` ProgrammableSwitchOutputStateOff: ${this.ProgrammableSwitchOutputStateOff}`);
            }
        }
    }
    async disablePushOnChanges(device) {
        if (device.disablePushOn === undefined) {
            this.disablePushOn = false;
        }
        else {
            this.disablePushOn = device.disablePushOn;
        }
    }
    async disablePushOffChanges(device) {
        if (device.disablePushOff === undefined) {
            this.disablePushOff = false;
        }
        else {
            this.disablePushOff = device.disablePushOff;
        }
    }
    async commandType() {
        let commandType;
        if (this.device.customize) {
            commandType = 'customize';
        }
        else {
            commandType = 'command';
        }
        return commandType;
    }
    async commandOn() {
        let command;
        if (this.device.customize && this.device.customOn) {
            command = this.device.customOn;
        }
        else {
            command = 'turnOn';
        }
        return command;
    }
    async commandOff() {
        let command;
        if (this.device.customize && this.device.customOff) {
            command = this.device.customOff;
        }
        else {
            command = 'turnOff';
        }
        return command;
    }
    async statusCode(statusCode) {
        switch (statusCode) {
            case 151:
                this.errorLog(`${this.device.remoteType}: ${this.accessory.displayName} Command not supported by this deviceType, statusCode: ${statusCode}`);
                break;
            case 152:
                this.errorLog(`${this.device.remoteType}: ${this.accessory.displayName} Device not found, statusCode: ${statusCode}`);
                break;
            case 160:
                this.errorLog(`${this.device.remoteType}: ${this.accessory.displayName} Command is not supported, statusCode: ${statusCode}`);
                break;
            case 161:
                this.errorLog(`${this.device.remoteType}: ${this.accessory.displayName} Device is offline, statusCode: ${statusCode}`);
                break;
            case 171:
                this.errorLog(`${this.device.remoteType}: ${this.accessory.displayName} Hub Device is offline, statusCode: ${statusCode}. ` +
                    `Hub: ${this.device.hubDeviceId}`);
                break;
            case 190:
                this.errorLog(`${this.device.remoteType}: ${this.accessory.displayName} Device internal error due to device states not synchronized with server,` +
                    ` Or command format is invalid, statusCode: ${statusCode}`);
                break;
            case 100:
                this.debugLog(`${this.device.remoteType}: ${this.accessory.displayName} Command successfully sent, statusCode: ${statusCode}`);
                break;
            case 200:
                this.debugLog(`${this.device.remoteType}: ${this.accessory.displayName} Request successful, statusCode: ${statusCode}`);
                break;
            default:
                this.infoLog(`${this.device.remoteType}: ${this.accessory.displayName} Unknown statusCode: ` +
                    `${statusCode}, Submit Bugs Here: ' + 'https://tinyurl.com/SwitchBotBug`);
        }
    }
    async apiError(e) {
        if (this.device.irlight?.stateless) {
            this.lightBulbService?.updateCharacteristic(this.platform.Characteristic.On, e);
        }
        else {
            this.ProgrammableSwitchServiceOn?.updateCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent, e);
            this.ProgrammableSwitchServiceOn?.updateCharacteristic(this.platform.Characteristic.ProgrammableSwitchOutputState, e);
            this.ProgrammableSwitchServiceOff?.updateCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent, e);
            this.ProgrammableSwitchServiceOff?.updateCharacteristic(this.platform.Characteristic.ProgrammableSwitchOutputState, e);
        }
    }
    async context() {
        if (this.On === undefined) {
            this.On = false;
        }
        else {
            this.On = this.accessory.context.On;
        }
        if (this.FirmwareRevision === undefined) {
            this.FirmwareRevision = this.platform.version;
            this.accessory.context.FirmwareRevision = this.FirmwareRevision;
        }
    }
    async config(device) {
        let config = {};
        if (device.irlight) {
            config = device.irlight;
        }
        if (device.logging !== undefined) {
            config['logging'] = device.logging;
        }
        if (device.connectionType !== undefined) {
            config['connectionType'] = device.connectionType;
        }
        if (device.external !== undefined) {
            config['external'] = device.external;
        }
        if (device.customOn !== undefined) {
            config['customOn'] = device.customOn;
        }
        if (device.customOff !== undefined) {
            config['customOff'] = device.customOff;
        }
        if (device.customize !== undefined) {
            config['customize'] = device.customize;
        }
        if (device.disablePushOn !== undefined) {
            config['disablePushOn'] = device.disablePushOn;
        }
        if (device.disablePushOff !== undefined) {
            config['disablePushOff'] = device.disablePushOff;
        }
        if (Object.entries(config).length !== 0) {
            this.debugWarnLog(`${this.device.remoteType}: ${this.accessory.displayName} Config: ${JSON.stringify(config)}`);
        }
    }
    async logs(device) {
        if (this.platform.debugMode) {
            this.deviceLogging = this.accessory.context.logging = 'debugMode';
            this.debugLog(`${this.device.remoteType}: ${this.accessory.displayName} Using Debug Mode Logging: ${this.deviceLogging}`);
        }
        else if (device.logging) {
            this.deviceLogging = this.accessory.context.logging = device.logging;
            this.debugLog(`${this.device.remoteType}: ${this.accessory.displayName} Using Device Config Logging: ${this.deviceLogging}`);
        }
        else if (this.platform.config.options?.logging) {
            this.deviceLogging = this.accessory.context.logging = this.platform.config.options?.logging;
            this.debugLog(`${this.device.remoteType}: ${this.accessory.displayName} Using Platform Config Logging: ${this.deviceLogging}`);
        }
        else {
            this.deviceLogging = this.accessory.context.logging = 'standard';
            this.debugLog(`${this.device.remoteType}: ${this.accessory.displayName} Logging Not Set, Using: ${this.deviceLogging}`);
        }
    }
    /**
     * Logging for Device
     */
    infoLog(...log) {
        if (this.enablingDeviceLogging()) {
            this.platform.log.info(String(...log));
        }
    }
    warnLog(...log) {
        if (this.enablingDeviceLogging()) {
            this.platform.log.warn(String(...log));
        }
    }
    debugWarnLog(...log) {
        if (this.enablingDeviceLogging()) {
            if (this.deviceLogging?.includes('debug')) {
                this.platform.log.warn('[DEBUG]', String(...log));
            }
        }
    }
    errorLog(...log) {
        if (this.enablingDeviceLogging()) {
            this.platform.log.error(String(...log));
        }
    }
    debugErrorLog(...log) {
        if (this.enablingDeviceLogging()) {
            if (this.deviceLogging?.includes('debug')) {
                this.platform.log.error('[DEBUG]', String(...log));
            }
        }
    }
    debugLog(...log) {
        if (this.enablingDeviceLogging()) {
            if (this.deviceLogging === 'debug') {
                this.platform.log.info('[DEBUG]', String(...log));
            }
            else {
                this.platform.log.debug(String(...log));
            }
        }
    }
    enablingDeviceLogging() {
        return this.deviceLogging.includes('debug') || this.deviceLogging === 'standard';
    }
}
exports.Light = Light;
//# sourceMappingURL=light.js.map