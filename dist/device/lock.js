"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lock = void 0;
const undici_1 = require("undici");
const utils_1 = require("../utils");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const settings_1 = require("../settings");
class Lock {
    constructor(platform, accessory, device) {
        this.platform = platform;
        this.accessory = accessory;
        this.device = device;
        // Connection
        this.BLE = this.device.connectionType === 'BLE' || this.device.connectionType === 'BLE/OpenAPI';
        this.OpenAPI = this.device.connectionType === 'OpenAPI' || this.device.connectionType === 'BLE/OpenAPI';
        // default placeholders
        this.logs(device);
        this.scan(device);
        this.refreshRate(device);
        this.context();
        this.config(device);
        // this is subject we use to track when we need to POST changes to the SwitchBot API
        this.doLockUpdate = new rxjs_1.Subject();
        this.lockUpdateInProgress = false;
        // Retrieve initial values and updateHomekit
        this.refreshStatus();
        // set accessory information
        accessory
            .getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'SwitchBot')
            .setCharacteristic(this.platform.Characteristic.Model, 'W1601700')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, device.deviceId)
            .setCharacteristic(this.platform.Characteristic.FirmwareRevision, accessory.context.FirmwareRevision);
        // get the LockMechanism service if it exists, otherwise create a new LockMechanism service
        // you can create multiple services for each accessory
        const lockService = `${accessory.displayName} ${device.deviceType}`;
        (this.lockService = accessory.getService(this.platform.Service.LockMechanism)
            || accessory.addService(this.platform.Service.LockMechanism)), lockService;
        this.lockService.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);
        if (!this.lockService.testCharacteristic(this.platform.Characteristic.ConfiguredName)) {
            this.lockService.addCharacteristic(this.platform.Characteristic.ConfiguredName, accessory.displayName);
        }
        // each service must implement at-minimum the "required characteristics" for the given service type
        // see https://developers.homebridge.io/#/service/LockMechanism
        // create handlers for required characteristics
        this.lockService.getCharacteristic(this.platform.Characteristic.LockTargetState).onSet(this.LockTargetStateSet.bind(this));
        // Latch Button Service
        if (device.lock?.activate_latchbutton === false) { // remove the service when this variable is false
            this.debugLog(`${this.device.deviceType}: ${accessory.displayName} Removing Latch Button Service`);
            this.latchButtonService = accessory.getService(this.platform.Service.Switch);
            if (this.latchButtonService) {
                accessory.removeService(this.latchButtonService);
                this.latchButtonService = undefined; // Reset the service variable to undefined
            }
        }
        else if (!this.latchButtonService) {
            this.debugLog(`${this.device.deviceType}: ${accessory.displayName} Adding Latch Button Service`);
            const latchServiceName = `${accessory.displayName} Latch`;
            this.latchButtonService = accessory.getService(this.platform.Service.Switch)
                || accessory.addService(this.platform.Service.Switch, latchServiceName, 'LatchButtonServiceIdentifier');
            this.latchButtonService.setCharacteristic(this.platform.Characteristic.Name, latchServiceName);
            if (!this.latchButtonService.testCharacteristic(this.platform.Characteristic.On)) {
                this.latchButtonService.addCharacteristic(this.platform.Characteristic.On);
            }
            this.latchButtonService.getCharacteristic(this.platform.Characteristic.On)
                .on('set', (value, callback) => {
                if (typeof value === 'boolean') {
                    this.handleLatchCharacteristic(value, callback);
                }
                else {
                    callback(new Error('Wrong characteristic value type'));
                }
            });
        }
        else {
            this.debugLog(`${this.device.deviceType}: ${accessory.displayName} Latch Button Service already exists`);
        }
        // Contact Sensor Service
        if (device.lock?.hide_contactsensor) {
            this.debugLog(`${this.device.deviceType}: ${accessory.displayName} Removing Contact Sensor Service`);
            this.contactSensorService = this.accessory.getService(this.platform.Service.ContactSensor);
            accessory.removeService(this.contactSensorService);
        }
        else if (!this.contactSensorService) {
            this.debugLog(`${this.device.deviceType}: ${accessory.displayName} Add Contact Sensor Service`);
            const contactSensorService = `${accessory.displayName} Contact Sensor`;
            (this.contactSensorService = this.accessory.getService(this.platform.Service.ContactSensor)
                || this.accessory.addService(this.platform.Service.ContactSensor)), contactSensorService;
            this.contactSensorService.setCharacteristic(this.platform.Characteristic.Name, `${accessory.displayName} Contact Sensor`);
            if (!this.contactSensorService.testCharacteristic(this.platform.Characteristic.ConfiguredName)) {
                this.contactSensorService.addCharacteristic(this.platform.Characteristic.ConfiguredName, `${accessory.displayName} Contact Sensor`);
            }
        }
        else {
            this.debugLog(`${this.device.deviceType}: ${accessory.displayName} Contact Sensor Service Not Added`);
        }
        // Battery Service
        const batteryService = `${accessory.displayName} Battery`;
        (this.batteryService = this.accessory.getService(this.platform.Service.Battery)
            || accessory.addService(this.platform.Service.Battery)), batteryService;
        this.batteryService.setCharacteristic(this.platform.Characteristic.Name, `${accessory.displayName} Battery`);
        if (!this.batteryService.testCharacteristic(this.platform.Characteristic.ConfiguredName)) {
            this.batteryService.addCharacteristic(this.platform.Characteristic.ConfiguredName, `${accessory.displayName} Battery`);
        }
        this.batteryService.setCharacteristic(this.platform.Characteristic.ChargingState, this.platform.Characteristic.ChargingState.NOT_CHARGEABLE);
        // Update Homekit
        this.updateHomeKitCharacteristics();
        // Start an update interval
        (0, rxjs_1.interval)(this.deviceRefreshRate * 1000)
            .pipe((0, operators_1.skipWhile)(() => this.lockUpdateInProgress))
            .subscribe(async () => {
            await this.refreshStatus();
        });
        //regisiter webhook event handler
        if (this.device.webhook) {
            this.infoLog(`${this.device.deviceType}: ${this.accessory.displayName} is listening webhook.`);
            this.platform.webhookEventHandler[this.device.deviceId] = async (context) => {
                try {
                    this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} received Webhook: ${JSON.stringify(context)}`);
                    const { lockState } = context;
                    const { LockCurrentState } = this;
                    this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} ` +
                        '(lockState) = ' +
                        `Webhook:(${lockState}), ` +
                        `current:(${LockCurrentState})`);
                    this.LockCurrentState = lockState === 'LOCKED' ? 1 : 0;
                    this.updateHomeKitCharacteristics();
                }
                catch (e) {
                    this.errorLog(`${this.device.deviceType}: ${this.accessory.displayName} `
                        + `failed to handle webhook. Received: ${JSON.stringify(context)} Error: ${e}`);
                }
            };
        }
        // Watch for Lock change events
        // We put in a debounce of 100ms so we don't make duplicate calls
        this.doLockUpdate
            .pipe((0, operators_1.tap)(() => {
            this.lockUpdateInProgress = true;
        }), (0, operators_1.debounceTime)(this.platform.config.options.pushRate * 1000))
            .subscribe(async () => {
            try {
                await this.pushChanges();
            }
            catch (e) {
                this.apiError(e);
                this.errorLog(`${this.device.deviceType}: ${this.accessory.displayName} failed pushChanges with ${this.device.connectionType} Connection,` +
                    ` Error Message: ${JSON.stringify(e.message)}`);
            }
            this.lockUpdateInProgress = false;
        });
    }
    /**
     * Method for handling the LatchCharacteristic
     */
    handleLatchCharacteristic(value, callback) {
        this.debugLog(`handleLatchCharacteristic called with value: ${value}`);
        if (value) {
            this.debugLog('Attempting to open the latch');
            this.openAPIpushChanges(value).then(() => {
                this.debugLog('Latch opened successfully');
                this.debugLog(`LatchButtonService is: ${this.latchButtonService ? 'available' : 'not available'}`);
                // simulate button press to turn the switch back off
                if (this.latchButtonService) {
                    const latchButtonService = this.latchButtonService;
                    // Simulate a button press by waiting a short period before turning the switch off
                    setTimeout(() => {
                        latchButtonService.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
                        this.debugLog('Latch button switched off automatically.');
                    }, 500); // 500 ms delay
                }
                callback(null);
            }).catch((error) => {
                // Log the error if the operation failed
                this.debugLog(`Error opening latch: ${error}`);
                // Ensure we turn the switch back off even in case of an error
                if (this.latchButtonService) {
                    this.latchButtonService.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
                    this.debugLog('Latch button switched off after an error.');
                }
                callback(error);
            });
        }
        else {
            this.debugLog('Switch is off, nothing to do');
            callback(null);
        }
    }
    /**
     * Parse the device status from the SwitchBot api
     */
    async parseStatus() {
        if (!this.device.enableCloudService && this.OpenAPI) {
            this.errorLog(`${this.device.deviceType}: ${this.accessory.displayName} parseStatus enableCloudService: ${this.device.enableCloudService}`);
            /* } else if (this.BLE) {
              await this.BLEparseStatus();*/
        }
        else if (this.OpenAPI && this.platform.config.credentials?.token) {
            await this.openAPIparseStatus();
        }
        else {
            await this.offlineOff();
            this.debugWarnLog(`${this.device.deviceType}: ${this.accessory.displayName} Connection Type:` + ` ${this.device.connectionType}, parseStatus will not happen.`);
        }
    }
    async BLEparseStatus() {
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} BLEparseStatus`);
        switch (this.BLE_LockCurrentState) {
            case 'locked':
                this.LockCurrentState = this.platform.Characteristic.LockCurrentState.SECURED;
                this.LockTargetState = this.platform.Characteristic.LockTargetState.SECURED;
                break;
            default:
                this.LockCurrentState = this.platform.Characteristic.LockCurrentState.UNSECURED;
                this.LockTargetState = this.platform.Characteristic.LockTargetState.UNSECURED;
        }
        switch (this.BLE_ContactSensorState) {
            case 'opened':
                this.ContactSensorState = this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
                break;
            default:
                this.ContactSensorState = this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
        }
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} On: ${this.LockTargetState}`);
        // Battery
        this.BatteryLevel = Number(this.BLE_BatteryLevel);
        if (this.BatteryLevel < 10) {
            this.StatusLowBattery = this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
        }
        else {
            this.StatusLowBattery = this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
        }
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} BatteryLevel: ${this.BatteryLevel},` + ` StatusLowBattery: ${this.StatusLowBattery}`);
    }
    async openAPIparseStatus() {
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} openAPIparseStatus`);
        switch (this.OpenAPI_LockCurrentState) {
            case 'locked':
                this.LockCurrentState = this.platform.Characteristic.LockCurrentState.SECURED;
                this.LockTargetState = this.platform.Characteristic.LockTargetState.SECURED;
                break;
            default:
                this.LockCurrentState = this.platform.Characteristic.LockCurrentState.UNSECURED;
                this.LockTargetState = this.platform.Characteristic.LockTargetState.UNSECURED;
        }
        switch (this.OpenAPI_ContactSensorState) {
            case 'opened':
                this.ContactSensorState = this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
                break;
            default:
                this.ContactSensorState = this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
        }
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} On: ${this.LockTargetState}`);
        // Battery
        this.BatteryLevel = Number(this.OpenAPI_BatteryLevel);
        if (this.BatteryLevel < 10) {
            this.StatusLowBattery = this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
        }
        else {
            this.StatusLowBattery = this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
        }
        if (Number.isNaN(this.BatteryLevel)) {
            this.BatteryLevel = 100;
        }
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} BatteryLevel: ${this.BatteryLevel},`
            + ` StatusLowBattery: ${this.StatusLowBattery}`);
        // FirmwareRevision
        this.FirmwareRevision = this.OpenAPI_FirmwareRevision;
        this.accessory.context.FirmwareRevision = this.FirmwareRevision;
    }
    /**
     * Asks the SwitchBot API for the latest device information
     */
    async refreshStatus() {
        if (!this.device.enableCloudService && this.OpenAPI) {
            this.errorLog(`${this.device.deviceType}: ${this.accessory.displayName} refreshStatus enableCloudService: ${this.device.enableCloudService}`);
        }
        else if (this.BLE) {
            await this.BLERefreshStatus();
        }
        else if (this.OpenAPI && this.platform.config.credentials?.token) {
            await this.openAPIRefreshStatus();
        }
        else {
            await this.offlineOff();
            this.debugWarnLog(`${this.device.deviceType}: ${this.accessory.displayName} Connection Type:` +
                ` ${this.device.connectionType}, refreshStatus will not happen.`);
        }
    }
    async BLERefreshStatus() {
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} BLERefreshStatus`);
        const switchbot = await this.platform.connectBLE();
        // Convert to BLE Address
        this.device.bleMac = this.device
            .deviceId.match(/.{1,2}/g)
            .join(':')
            .toLowerCase();
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} BLE Address: ${this.device.bleMac}`);
        this.getCustomBLEAddress(switchbot);
        // Start to monitor advertisement packets
        if (switchbot !== false) {
            switchbot
                .startScan({
                model: 'o',
                id: this.device.bleMac,
            })
                .then(async () => {
                // Set an event hander
                switchbot.onadvertisement = async (ad) => {
                    this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Config BLE Address: ${this.device.bleMac},` +
                        ` BLE Address Found: ${ad.address}`);
                    this.BLE_BatteryLevel = ad.serviceData.battery;
                    this.BLE_Calibration = ad.serviceData.calibration;
                    this.BLE_LockCurrentState = ad.serviceData.status;
                    this.BLE_ContactSensorState = ad.serviceData.door_open;
                    this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} serviceData: ${JSON.stringify(ad.serviceData)}`);
                    this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} battery: ${ad.serviceData.battery}, ` +
                        `calibration: ${ad.serviceData.calibration}, status: ${ad.serviceData.status}, battery: ${ad.serviceData.battery}, ` +
                        `door_open: ${ad.serviceData.door_open}`);
                    if (ad.serviceData) {
                        this.BLE_IsConnected = true;
                        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} connected: ${this.BLE_IsConnected}`);
                        await this.stopScanning(switchbot);
                    }
                    else {
                        this.BLE_IsConnected = false;
                        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} connected: ${this.BLE_IsConnected}`);
                    }
                };
                // Wait
                return await (0, utils_1.sleep)(this.scanDuration * 1000);
            })
                .then(async () => {
                // Stop to monitor
                await this.stopScanning(switchbot);
            })
                .catch(async (e) => {
                this.apiError(e);
                this.errorLog(`${this.device.deviceType}: ${this.accessory.displayName} failed BLERefreshStatus with ${this.device.connectionType}` +
                    ` Connection, Error Message: ${JSON.stringify(e.message)}`);
                await this.BLERefreshConnection(switchbot);
            });
        }
        else {
            await this.BLERefreshConnection(switchbot);
        }
    }
    async openAPIRefreshStatus() {
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} openAPIRefreshStatus`);
        try {
            const { body, statusCode, headers } = await (0, undici_1.request)(`${settings_1.Devices}/${this.device.deviceId}/status`, {
                headers: this.platform.generateHeaders(),
            });
            this.debugWarnLog(`${this.device.deviceType}: ${this.accessory.displayName} body: ${JSON.stringify(body)}`);
            this.debugWarnLog(`${this.device.deviceType}: ${this.accessory.displayName} statusCode: ${statusCode}`);
            this.debugWarnLog(`${this.device.deviceType}: ${this.accessory.displayName} headers: ${JSON.stringify(headers)}`);
            const deviceStatus = await body.json();
            this.debugWarnLog(`${this.device.deviceType}: ${this.accessory.displayName} deviceStatus: ${JSON.stringify(deviceStatus)}`);
            this.debugWarnLog(`${this.device.deviceType}: ${this.accessory.displayName} deviceStatus body: ${JSON.stringify(deviceStatus.body)}`);
            this.debugWarnLog(`${this.device.deviceType}: ${this.accessory.displayName} deviceStatus statusCode: ${deviceStatus.statusCode}`);
            if ((statusCode === 200 || statusCode === 100) && (deviceStatus.statusCode === 200 || deviceStatus.statusCode === 100)) {
                this.debugErrorLog(`${this.device.deviceType}: ${this.accessory.displayName} `
                    + `statusCode: ${statusCode} & deviceStatus StatusCode: ${deviceStatus.statusCode}`);
                this.OpenAPI_LockCurrentState = deviceStatus.body.lockState;
                this.OpenAPI_ContactSensorState = deviceStatus.body.doorState;
                this.OpenAPI_BatteryLevel = deviceStatus.body.battery;
                this.OpenAPI_FirmwareRevision = deviceStatus.body.version;
                this.openAPIparseStatus();
                this.updateHomeKitCharacteristics();
            }
            else {
                this.statusCode(statusCode);
                this.statusCode(deviceStatus.statusCode);
            }
        }
        catch (e) {
            this.apiError(e);
            this.errorLog(`${this.device.deviceType}: ${this.accessory.displayName} failed openAPIRefreshStatus with ${this.device.connectionType}` +
                ` Connection, Error Message: ${JSON.stringify(e.message)}`);
        }
    }
    /**
     * Pushes the requested changes to the SwitchBot API
     * deviceType	commandType	  Command	    command parameter	  Description
     * Lock   -    "command"     "lock"     "default"	 =        set to ???? state
     * Lock   -    "command"     "unlock"   "default"	 =        set to ???? state - LockCurrentState
     */
    async pushChanges() {
        if (!this.device.enableCloudService && this.OpenAPI) {
            this.errorLog(`${this.device.deviceType}: ${this.accessory.displayName} pushChanges enableCloudService: ${this.device.enableCloudService}`);
            /*} else if (this.BLE) {
              await this.BLEpushChanges();*/
        }
        else if (this.OpenAPI && this.platform.config.credentials?.token) {
            await this.openAPIpushChanges();
        }
        else {
            await this.offlineOff();
            this.debugWarnLog(`${this.device.deviceType}: ${this.accessory.displayName} Connection Type:` + ` ${this.device.connectionType}, pushChanges will not happen.`);
        }
        // Refresh the status from the API
        (0, rxjs_1.interval)(15000)
            .pipe((0, operators_1.skipWhile)(() => this.lockUpdateInProgress))
            .pipe((0, operators_1.take)(1))
            .subscribe(async () => {
            await this.refreshStatus();
        });
    }
    async BLEpushChanges() {
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} BLEpushChanges`);
        if (this.LockTargetState !== this.accessory.context.LockTargetState) {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} BLEpushChanges LockTargetState: ${this.LockTargetState}` +
                ` LockTargetStateCached: ${this.accessory.context.LockTargetState}`);
            const switchbot = await this.platform.connectBLE();
            // Convert to BLE Address
            this.device.bleMac = this.device
                .deviceId.match(/.{1,2}/g)
                .join(':')
                .toLowerCase();
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} BLE Address: ${this.device.bleMac}`);
            switchbot
                .discover({
                model: '',
                id: this.device.bleMac,
            })
                .then(() => {
                this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Done.`);
                this.LockTargetState = this.platform.Characteristic.LockTargetState.SECURED;
            })
                .catch(async (e) => {
                this.apiError(e);
                this.errorLog(`${this.device.deviceType}: ${this.accessory.displayName} failed BLEpushChanges with ${this.device.connectionType}` +
                    ` Connection, Error Message: ${JSON.stringify(e.message)}`);
                await this.BLEPushConnection();
            });
        }
        else {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} No BLEpushChanges.` +
                `LockTargetState: ${this.LockTargetState}, ` +
                `LockTargetStateCached: ${this.accessory.context.LockTargetState}`);
        }
    }
    async openAPIpushChanges(LatchUnlock) {
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} openAPIpushChanges`);
        if ((this.LockTargetState !== this.accessory.context.LockTargetState) || LatchUnlock) {
            // Determine the command based on the LockTargetState or the forceUnlock parameter
            let command = '';
            if (LatchUnlock) {
                command = 'unlock';
            }
            else {
                command = this.LockTargetState ? 'lock' : 'unlock';
            }
            const bodyChange = JSON.stringify({
                command: `${command}`,
                parameter: 'default',
                commandType: 'command',
            });
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Sending request to SwitchBot API, body: ${bodyChange},`);
            try {
                const { body, statusCode, headers } = await (0, undici_1.request)(`${settings_1.Devices}/${this.device.deviceId}/commands`, {
                    body: bodyChange,
                    method: 'POST',
                    headers: this.platform.generateHeaders(),
                });
                this.debugWarnLog(`${this.device.deviceType}: ${this.accessory.displayName} body: ${JSON.stringify(body)}`);
                this.debugWarnLog(`${this.device.deviceType}: ${this.accessory.displayName} statusCode: ${statusCode}`);
                this.debugWarnLog(`${this.device.deviceType}: ${this.accessory.displayName} headers: ${JSON.stringify(headers)}`);
                const deviceStatus = await body.json();
                this.debugWarnLog(`${this.device.deviceType}: ${this.accessory.displayName} deviceStatus: ${JSON.stringify(deviceStatus)}`);
                this.debugWarnLog(`${this.device.deviceType}: ${this.accessory.displayName} deviceStatus body: ${JSON.stringify(deviceStatus.body)}`);
                this.debugWarnLog(`${this.device.deviceType}: ${this.accessory.displayName} deviceStatus statusCode: ${deviceStatus.statusCode}`);
                if ((statusCode === 200 || statusCode === 100) && (deviceStatus.statusCode === 200 || deviceStatus.statusCode === 100)) {
                    this.debugErrorLog(`${this.device.deviceType}: ${this.accessory.displayName} `
                        + `statusCode: ${statusCode} & deviceStatus StatusCode: ${deviceStatus.statusCode}`);
                }
                else {
                    this.statusCode(statusCode);
                    this.statusCode(deviceStatus.statusCode);
                }
            }
            catch (e) {
                this.apiError(e);
                this.errorLog(`${this.device.deviceType}: ${this.accessory.displayName} failed openAPIpushChanges with ${this.device.connectionType}` +
                    ` Connection, Error Message: ${JSON.stringify(e.message)}`);
            }
        }
        else {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} No openAPIpushChanges.` +
                `LockTargetState: ${this.LockTargetState}, ` +
                `LockTargetStateCached: ${this.accessory.context.LockTargetState}`);
        }
    }
    /**
     * Handle requests to set the value of the "On" characteristic
     */
    async LockTargetStateSet(value) {
        if (this.LockTargetState === this.accessory.context.LockTargetState) {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} No Changes, Set LockTargetState: ${value}`);
        }
        else {
            this.infoLog(`${this.device.deviceType}: ${this.accessory.displayName} Set LockTargetState: ${value}`);
        }
        this.LockTargetState = value;
        this.doLockUpdate.next();
    }
    async updateHomeKitCharacteristics() {
        if (!this.device.lock?.hide_contactsensor) {
            if (this.ContactSensorState === undefined) {
                this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} ContactSensorState: ${this.ContactSensorState}`);
            }
            else {
                this.accessory.context.ContactSensorState = this.ContactSensorState;
                this.contactSensorService?.updateCharacteristic(this.platform.Characteristic.ContactSensorState, this.ContactSensorState);
                this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} updateCharacteristic ContactSensorState: ${this.ContactSensorState}`);
            }
        }
        if (this.LockTargetState === undefined) {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} LockTargetState: ${this.LockTargetState}`);
        }
        else {
            this.accessory.context.LockTargetState = this.LockTargetState;
            this.lockService.updateCharacteristic(this.platform.Characteristic.LockTargetState, this.LockTargetState);
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} updateCharacteristic LockTargetState: ${this.LockTargetState}`);
        }
        if (this.LockCurrentState === undefined) {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} LockCurrentState: ${this.LockCurrentState}`);
        }
        else {
            this.accessory.context.LockCurrentState = this.LockCurrentState;
            this.lockService.updateCharacteristic(this.platform.Characteristic.LockCurrentState, this.LockCurrentState);
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} updateCharacteristic LockCurrentState: ${this.LockCurrentState}`);
        }
        if (this.BatteryLevel === undefined) {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} BatteryLevel: ${this.BatteryLevel}`);
        }
        else {
            this.accessory.context.BatteryLevel = this.BatteryLevel;
            this.batteryService?.updateCharacteristic(this.platform.Characteristic.BatteryLevel, this.BatteryLevel);
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} updateCharacteristic BatteryLevel: ${this.BatteryLevel}`);
        }
        if (this.StatusLowBattery === undefined) {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} StatusLowBattery: ${this.StatusLowBattery}`);
        }
        else {
            this.accessory.context.StatusLowBattery = this.StatusLowBattery;
            this.batteryService?.updateCharacteristic(this.platform.Characteristic.StatusLowBattery, this.StatusLowBattery);
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} updateCharacteristic StatusLowBattery: ${this.StatusLowBattery}`);
        }
    }
    async stopScanning(switchbot) {
        await switchbot.stopScan();
        if (this.BLE_IsConnected) {
            await this.BLEparseStatus();
            await this.updateHomeKitCharacteristics();
        }
        else {
            await this.BLERefreshConnection(switchbot);
        }
    }
    async getCustomBLEAddress(switchbot) {
        if (this.device.customBLEaddress && this.deviceLogging.includes('debug')) {
            (async () => {
                // Start to monitor advertisement packets
                await switchbot.startScan({
                    model: 'c',
                });
                // Set an event handler
                switchbot.onadvertisement = (ad) => {
                    this.warnLog(`${this.device.deviceType}: ${this.accessory.displayName} ad: ${JSON.stringify(ad, null, '  ')}`);
                };
                await (0, utils_1.sleep)(10000);
                // Stop to monitor
                await switchbot.stopScan();
            })();
        }
    }
    async BLEPushConnection() {
        if (this.platform.config.credentials?.token && this.device.connectionType === 'BLE/OpenAPI') {
            this.warnLog(`${this.device.deviceType}: ${this.accessory.displayName} Using OpenAPI Connection to Push Changes`);
            await this.openAPIpushChanges();
        }
    }
    async BLERefreshConnection(switchbot) {
        this.errorLog(`${this.device.deviceType}: ${this.accessory.displayName} wasn't able to establish BLE Connection, node-switchbot: ${switchbot}`);
        if (this.platform.config.credentials?.token && this.device.connectionType === 'BLE/OpenAPI') {
            this.warnLog(`${this.device.deviceType}: ${this.accessory.displayName} Using OpenAPI Connection to Refresh Status`);
            await this.openAPIRefreshStatus();
        }
    }
    async scan(device) {
        if (device.scanDuration) {
            this.scanDuration = this.accessory.context.scanDuration = device.scanDuration;
            if (this.BLE) {
                this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Using Device Config scanDuration: ${this.scanDuration}`);
            }
        }
        else {
            this.scanDuration = this.accessory.context.scanDuration = 1;
            if (this.BLE) {
                this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Using Default scanDuration: ${this.scanDuration}`);
            }
        }
    }
    async statusCode(statusCode) {
        switch (statusCode) {
            case 151:
                this.errorLog(`${this.device.deviceType}: ${this.accessory.displayName} Command not supported by this deviceType, statusCode: ${statusCode}`);
                break;
            case 152:
                this.errorLog(`${this.device.deviceType}: ${this.accessory.displayName} Device not found, statusCode: ${statusCode}`);
                break;
            case 160:
                this.errorLog(`${this.device.deviceType}: ${this.accessory.displayName} Command is not supported, statusCode: ${statusCode}`);
                break;
            case 161:
                this.errorLog(`${this.device.deviceType}: ${this.accessory.displayName} Device is offline, statusCode: ${statusCode}`);
                this.offlineOff();
                break;
            case 171:
                this.errorLog(`${this.device.deviceType}: ${this.accessory.displayName} Hub Device is offline, statusCode: ${statusCode}. ` +
                    `Hub: ${this.device.hubDeviceId}`);
                this.offlineOff();
                break;
            case 190:
                this.errorLog(`${this.device.deviceType}: ${this.accessory.displayName} Device internal error due to device states not synchronized with server,` +
                    ` Or command format is invalid, statusCode: ${statusCode}`);
                break;
            case 100:
                this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Command successfully sent, statusCode: ${statusCode}`);
                break;
            case 200:
                this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Request successful, statusCode: ${statusCode}`);
                break;
            default:
                this.infoLog(`${this.device.deviceType}: ${this.accessory.displayName} Unknown statusCode: ` +
                    `${statusCode}, Submit Bugs Here: ' + 'https://tinyurl.com/SwitchBotBug`);
        }
    }
    async offlineOff() {
        if (this.device.offline) {
            await this.context();
            await this.updateHomeKitCharacteristics();
        }
    }
    async apiError(e) {
        if (!this.device.lock?.hide_contactsensor) {
            this.contactSensorService?.updateCharacteristic(this.platform.Characteristic.ContactSensorState, e);
        }
        this.lockService.updateCharacteristic(this.platform.Characteristic.LockTargetState, e);
        this.lockService.updateCharacteristic(this.platform.Characteristic.LockCurrentState, e);
    }
    async context() {
        if (this.LockTargetState === undefined) {
            this.LockTargetState = false;
        }
        else {
            this.LockTargetState = this.accessory.context.On;
        }
        if (this.FirmwareRevision === undefined) {
            this.FirmwareRevision = this.platform.version;
            this.accessory.context.FirmwareRevision = this.FirmwareRevision;
        }
    }
    async refreshRate(device) {
        if (device.refreshRate) {
            this.deviceRefreshRate = this.accessory.context.refreshRate = device.refreshRate;
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Using Device Config refreshRate: ${this.deviceRefreshRate}`);
        }
        else if (this.platform.config.options.refreshRate) {
            this.deviceRefreshRate = this.accessory.context.refreshRate = this.platform.config.options.refreshRate;
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Using Platform Config refreshRate: ${this.deviceRefreshRate}`);
        }
    }
    async config(device) {
        let config = {};
        if (device.lock) {
            config = device.lock;
        }
        if (device.connectionType !== undefined) {
            config['connectionType'] = device.connectionType;
        }
        if (device.external !== undefined) {
            config['external'] = device.external;
        }
        if (device.logging !== undefined) {
            config['logging'] = device.logging;
        }
        if (device.refreshRate !== undefined) {
            config['refreshRate'] = device.refreshRate;
        }
        if (device.scanDuration !== undefined) {
            config['scanDuration'] = device.scanDuration;
        }
        if (Object.entries(config).length !== 0) {
            this.debugWarnLog(`${this.device.deviceType}: ${this.accessory.displayName} Config: ${JSON.stringify(config)}`);
        }
    }
    async logs(device) {
        if (this.platform.debugMode) {
            this.deviceLogging = this.accessory.context.logging = 'debugMode';
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Using Debug Mode Logging: ${this.deviceLogging}`);
        }
        else if (device.logging) {
            this.deviceLogging = this.accessory.context.logging = device.logging;
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Using Device Config Logging: ${this.deviceLogging}`);
        }
        else if (this.platform.config.options?.logging) {
            this.deviceLogging = this.accessory.context.logging = this.platform.config.options?.logging;
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Using Platform Config Logging: ${this.deviceLogging}`);
        }
        else {
            this.deviceLogging = this.accessory.context.logging = 'standard';
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Logging Not Set, Using: ${this.deviceLogging}`);
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
exports.Lock = Lock;
//# sourceMappingURL=lock.js.map