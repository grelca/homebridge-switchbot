"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Humidifier = void 0;
const undici_1 = require("undici");
const utils_1 = require("../utils");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const settings_1 = require("../settings");
/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
class Humidifier {
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
        this.doHumidifierUpdate = new rxjs_1.Subject();
        this.humidifierUpdateInProgress = false;
        // Retrieve initial values and updateHomekit
        this.refreshStatus();
        // set accessory information
        accessory
            .getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'SwitchBot')
            .setCharacteristic(this.platform.Characteristic.Model, 'W0801800')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, device.deviceId)
            .setCharacteristic(this.platform.Characteristic.FirmwareRevision, accessory.context.FirmwareRevision);
        // get the service if it exists, otherwise create a new service
        // you can create multiple services for each accessory
        const humidifierService = `${accessory.displayName} Humidifier`;
        (this.humidifierService = accessory.getService(this.platform.Service.HumidifierDehumidifier)
            || accessory.addService(this.platform.Service.HumidifierDehumidifier)), humidifierService;
        this.humidifierService.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);
        if (!this.humidifierService.testCharacteristic(this.platform.Characteristic.ConfiguredName)) {
            this.humidifierService.addCharacteristic(this.platform.Characteristic.ConfiguredName, accessory.displayName);
        }
        // each service must implement at-minimum the "required characteristics" for the given service type
        // see https://developers.homebridge.io/#/service/HumidifierDehumidifier
        // create handlers for required characteristics
        this.humidifierService.setCharacteristic(this.platform.Characteristic.CurrentHumidifierDehumidifierState, this.CurrentHumidifierDehumidifierState);
        this.humidifierService
            .getCharacteristic(this.platform.Characteristic.TargetHumidifierDehumidifierState)
            .setProps({
            validValueRanges: [0, 1],
            minValue: 0,
            maxValue: 1,
            validValues: [0, 1],
        })
            .onSet(this.TargetHumidifierDehumidifierStateSet.bind(this));
        this.humidifierService.getCharacteristic(this.platform.Characteristic.Active).onSet(this.ActiveSet.bind(this));
        this.humidifierService
            .getCharacteristic(this.platform.Characteristic.RelativeHumidityHumidifierThreshold)
            .setProps({
            validValueRanges: [0, 100],
            minValue: 0,
            maxValue: 100,
            minStep: this.minStep(),
        })
            .onSet(this.RelativeHumidityHumidifierThresholdSet.bind(this));
        // Temperature Sensor Service
        if (device.humidifier?.hide_temperature || this.BLE) {
            this.debugLog(`${this.device.deviceType}: ${accessory.displayName} Removing Temperature Sensor Service`);
            this.temperatureservice = this.accessory.getService(this.platform.Service.TemperatureSensor);
            accessory.removeService(this.temperatureservice);
        }
        else if (!this.temperatureservice && !this.BLE) {
            this.debugLog(`${this.device.deviceType}: ${accessory.displayName} Add Temperature Sensor Service`);
            const temperatureservice = `${accessory.displayName} Temperature Sensor`;
            (this.temperatureservice = this.accessory.getService(this.platform.Service.TemperatureSensor)
                || this.accessory.addService(this.platform.Service.TemperatureSensor)), temperatureservice;
            this.temperatureservice.setCharacteristic(this.platform.Characteristic.Name, `${accessory.displayName} Temperature Sensor`);
            if (!this.temperatureservice.testCharacteristic(this.platform.Characteristic.ConfiguredName)) {
                this.temperatureservice.addCharacteristic(this.platform.Characteristic.ConfiguredName, `${accessory.displayName} Temperature Sensor`);
            }
            this.temperatureservice
                .getCharacteristic(this.platform.Characteristic.CurrentTemperature)
                .setProps({
                validValueRanges: [-273.15, 100],
                minValue: -273.15,
                maxValue: 100,
                minStep: 0.1,
            })
                .onGet(() => {
                return this.CurrentTemperature;
            });
        }
        else {
            this.debugLog(`${this.device.deviceType}: ${accessory.displayName} Temperature Sensor Service Not Added`);
        }
        // Retrieve initial values and updateHomekit
        this.updateHomeKitCharacteristics();
        // Start an update interval
        (0, rxjs_1.interval)(this.deviceRefreshRate * 1000)
            .pipe((0, operators_1.skipWhile)(() => this.humidifierUpdateInProgress))
            .subscribe(() => {
            this.refreshStatus();
        });
        //regisiter webhook event handler
        if (this.device.webhook) {
            this.infoLog(`${this.device.deviceType}: ${this.accessory.displayName} is listening webhook.`);
            this.platform.webhookEventHandler[this.device.deviceId] = async (context) => {
                try {
                    this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} received Webhook: ${JSON.stringify(context)}`);
                    if (context.scale === 'CELSIUS') {
                        const { temperature, humidity } = context;
                        const { CurrentTemperature, CurrentRelativeHumidity } = this;
                        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} ` +
                            '(temperature, humidity) = ' +
                            `Webhook:(${temperature}, ${humidity}), ` +
                            `current:(${CurrentTemperature}, ${CurrentRelativeHumidity})`);
                        this.CurrentRelativeHumidity = humidity;
                        this.CurrentTemperature = temperature;
                        this.updateHomeKitCharacteristics();
                    }
                }
                catch (e) {
                    this.errorLog(`${this.device.deviceType}: ${this.accessory.displayName} `
                        + `failed to handle webhook. Received: ${JSON.stringify(context)} Error: ${e}`);
                }
            };
        }
        // Watch for Humidifier change events
        // We put in a debounce of 100ms so we don't make duplicate calls
        this.doHumidifierUpdate
            .pipe((0, operators_1.tap)(() => {
            this.humidifierUpdateInProgress = true;
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
            this.humidifierUpdateInProgress = false;
        });
    }
    /**
     * Parse the device status from the SwitchBot api
     */
    async parseStatus() {
        if (!this.device.enableCloudService && this.OpenAPI) {
            this.errorLog(`${this.device.deviceType}: ${this.accessory.displayName} parseStatus enableCloudService: ${this.device.enableCloudService}`);
        }
        else if (this.BLE) {
            await this.BLEparseStatus();
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
        // Current Relative Humidity
        this.CurrentRelativeHumidity = this.percentage;
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} CurrentRelativeHumidity: ${this.CurrentRelativeHumidity}`);
        // Active
        if (this.onState) {
            this.Active = this.platform.Characteristic.Active.ACTIVE;
        }
        else {
            this.Active = this.platform.Characteristic.Active.INACTIVE;
        }
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Active: ${this.Active}`);
    }
    async openAPIparseStatus() {
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} openAPIparseStatus`);
        // Current Relative Humidity
        this.CurrentRelativeHumidity = this.OpenAPI_CurrentTemperature;
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} CurrentRelativeHumidity: ${this.CurrentRelativeHumidity}`);
        // Current Temperature
        if (!this.device.humidifier?.hide_temperature) {
            this.CurrentTemperature = this.OpenAPI_CurrentTemperature;
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} CurrentTemperature: ${this.CurrentTemperature}`);
        }
        // Target Humidifier Dehumidifier State
        switch (this.OpenAPI_CurrentHumidifierDehumidifierState) {
            case true:
                this.TargetHumidifierDehumidifierState = this.platform.Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER_OR_DEHUMIDIFIER;
                this.CurrentHumidifierDehumidifierState = this.platform.Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING;
                this.RelativeHumidityHumidifierThreshold = this.CurrentRelativeHumidity;
                break;
            default:
                this.TargetHumidifierDehumidifierState = this.platform.Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER;
                if (this.OpenAPI_RelativeHumidityHumidifierThreshold > 100) {
                    this.RelativeHumidityHumidifierThreshold = 100;
                }
                else {
                    this.RelativeHumidityHumidifierThreshold = this.OpenAPI_RelativeHumidityHumidifierThreshold;
                }
                if (this.CurrentRelativeHumidity > this.RelativeHumidityHumidifierThreshold) {
                    this.CurrentHumidifierDehumidifierState = this.platform.Characteristic.CurrentHumidifierDehumidifierState.IDLE;
                }
                else if (this.Active === this.platform.Characteristic.Active.INACTIVE) {
                    this.CurrentHumidifierDehumidifierState = this.platform.Characteristic.CurrentHumidifierDehumidifierState.INACTIVE;
                }
                else {
                    this.CurrentHumidifierDehumidifierState = this.platform.Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING;
                }
        }
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName}` + ` TargetHumidifierDehumidifierState: ${this.TargetHumidifierDehumidifierState}`);
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName}` +
            ` RelativeHumidityHumidifierThreshold: ${this.RelativeHumidityHumidifierThreshold}`);
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName}` + ` CurrentHumidifierDehumidifierState: ${this.CurrentHumidifierDehumidifierState}`);
        // Active
        switch (this.OpenAPI_Active) {
            case 'on':
                this.Active = this.platform.Characteristic.Active.ACTIVE;
                break;
            default:
                this.Active = this.platform.Characteristic.Active.INACTIVE;
        }
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Active: ${this.Active}`);
        // Water Level
        if (this.OpenAPI_WaterLevel) {
            this.WaterLevel = 0;
        }
        else {
            this.WaterLevel = 100;
        }
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} WaterLevel: ${this.WaterLevel}`);
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
                model: 'e',
                id: this.device.bleMac,
            })
                .then(async () => {
                // Set an event hander
                switchbot.onadvertisement = async (ad) => {
                    this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Config BLE Address: ${this.device.bleMac},` +
                        ` BLE Address Found: ${ad.address}`);
                    this.autoMode = ad.serviceData.autoMode;
                    this.onState = ad.serviceData.onState;
                    this.percentage = ad.serviceData.percentage;
                    this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} serviceData: ${JSON.stringify(ad.serviceData)}`);
                    this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} model: ${ad.serviceData.model}, modelName: ${ad.serviceData.modelName},` +
                        `autoMode: ${ad.serviceData.autoMode}, onState: ${ad.serviceData.onState}, percentage: ${ad.serviceData.percentage}`);
                    if (ad.serviceData) {
                        this.connected = true;
                        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} connected: ${this.connected}`);
                        await this.stopScanning(switchbot);
                    }
                    else {
                        this.connected = false;
                        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} connected: ${this.connected}`);
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
                this.OpenAPI_CurrentHumidifierDehumidifierState = deviceStatus.body.auto;
                this.OpenAPI_Active = deviceStatus.body.power;
                this.OpenAPI_WaterLevel = deviceStatus.body.lackWater;
                this.OpenAPI_CurrentRelativeHumidity = deviceStatus.body.humidity;
                this.OpenAPI_CurrentTemperature = deviceStatus.body.temperature;
                this.OpenAPI_RelativeHumidityHumidifierThreshold = deviceStatus.body.nebulizationEfficiency;
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
        (0, rxjs_1.interval)(5000)
            .pipe((0, operators_1.take)(1))
            .subscribe(async () => {
            await this.refreshStatus();
        });
    }
    async BLEpushChanges() {
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} BLEpushChanges`);
        const switchbot = await this.platform.connectBLE();
        // Convert to BLE Address
        this.device.bleMac = this.device
            .deviceId.match(/.{1,2}/g)
            .join(':')
            .toLowerCase();
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} BLE Address: ${this.device.bleMac}`);
        switchbot
            .discover({
            model: 'e',
            quick: true,
            id: this.device.bleMac,
        })
            .then(async (device_list) => {
            this.infoLog(`${this.accessory.displayName} Target Position: ${this.Active}`);
            return await device_list[0].percentage(this.RelativeHumidityHumidifierThreshold);
        })
            .then(() => {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Done.`);
        })
            .catch(async (e) => {
            this.apiError(e);
            this.errorLog(`${this.device.deviceType}: ${this.accessory.displayName} failed BLEpushChanges with ${this.device.connectionType}` +
                ` Connection, Error Message: ${JSON.stringify(e.message)}`);
            await this.BLEPushConnection();
        });
    }
    async openAPIpushChanges() {
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} openAPIpushChanges`);
        if (this.TargetHumidifierDehumidifierState === this.platform.Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER &&
            this.Active === this.platform.Characteristic.Active.ACTIVE) {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Pushing Manual: ${this.RelativeHumidityHumidifierThreshold}!`);
            const bodyChange = JSON.stringify({
                command: 'setMode',
                parameter: `${this.RelativeHumidityHumidifierThreshold}`,
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
        else if (this.TargetHumidifierDehumidifierState === this.platform.Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER_OR_DEHUMIDIFIER &&
            this.Active === this.platform.Characteristic.Active.ACTIVE) {
            await this.pushAutoChanges();
        }
        else {
            await this.pushActiveChanges();
        }
    }
    /**
     * Pushes the requested changes to the SwitchBot API
     */
    async pushAutoChanges() {
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} pushAutoChanges`);
        if (this.TargetHumidifierDehumidifierState === this.platform.Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER_OR_DEHUMIDIFIER &&
            this.Active === this.platform.Characteristic.Active.ACTIVE) {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Pushing Auto`);
            const bodyChange = JSON.stringify({
                command: 'setMode',
                parameter: 'auto',
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
                this.errorLog(`${this.device.deviceType}: ${this.accessory.displayName} failed pushAutoChanges with ${this.device.connectionType}` +
                    ` Connection, Error Message: ${JSON.stringify(e.message)}`);
            }
        }
        else {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} No pushAutoChanges.` +
                `TargetHumidifierDehumidifierState: ${this.TargetHumidifierDehumidifierState}, Active: ${this.Active}`);
        }
    }
    /**
     * Pushes the requested changes to the SwitchBot API
     */
    async pushActiveChanges() {
        this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} pushActiveChanges`);
        if (this.Active === this.platform.Characteristic.Active.INACTIVE) {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Pushing Off`);
            const bodyChange = JSON.stringify({
                command: 'turnOff',
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
                this.errorLog(`${this.device.deviceType}: ${this.accessory.displayName} failed pushActiveChanges with ${this.device.connectionType}` +
                    ` Connection, Error Message: ${JSON.stringify(e.message)}`);
            }
        }
        else {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} No pushActiveChanges. Active: ${this.Active}`);
        }
    }
    /**
     * Handle requests to set the "Active" characteristic
     */
    async ActiveSet(value) {
        if (this.Active === this.accessory.context.Active) {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} No Changes, Set Active: ${value}`);
        }
        else {
            this.infoLog(`${this.device.deviceType}: ${this.accessory.displayName} Set Active: ${value}`);
        }
        this.Active = value;
        this.doHumidifierUpdate.next();
    }
    /**
     * Handle requests to set the "Target Humidifier Dehumidifier State" characteristic
     */
    async TargetHumidifierDehumidifierStateSet(value) {
        if (this.Active === this.platform.Characteristic.Active.ACTIVE) {
            this.infoLog(`${this.device.deviceType}: ${this.accessory.displayName} Set TargetHumidifierDehumidifierState: ${value}`);
        }
        else {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Set TargetHumidifierDehumidifierState: ${value}`);
        }
        this.TargetHumidifierDehumidifierState = value;
        this.doHumidifierUpdate.next();
    }
    /**
     * Handle requests to set the "Relative Humidity Humidifier Threshold" characteristic
     */
    async RelativeHumidityHumidifierThresholdSet(value) {
        if (this.Active === this.platform.Characteristic.Active.ACTIVE) {
            this.infoLog(`${this.device.deviceType}: ${this.accessory.displayName} Set RelativeHumidityHumidifierThreshold: ${value}`);
        }
        else {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Set RelativeHumidityHumidifierThreshold: ${value}`);
        }
        this.RelativeHumidityHumidifierThreshold = value;
        if (this.Active === this.platform.Characteristic.Active.INACTIVE) {
            this.Active = this.platform.Characteristic.Active.ACTIVE;
            this.CurrentHumidifierDehumidifierState = this.platform.Characteristic.CurrentHumidifierDehumidifierState.IDLE;
        }
        this.doHumidifierUpdate.next();
    }
    /**
     * Updates the status for each of the HomeKit Characteristics
     */
    async updateHomeKitCharacteristics() {
        if (this.CurrentRelativeHumidity === undefined) {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} CurrentRelativeHumidity: ${this.CurrentRelativeHumidity}`);
        }
        else {
            this.humidifierService.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, this.CurrentRelativeHumidity);
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName}` + ` updateCharacteristic CurrentRelativeHumidity: ${this.CurrentRelativeHumidity}`);
            this.accessory.context.CurrentRelativeHumidity = this.CurrentRelativeHumidity;
        }
        if (this.OpenAPI) {
            if (this.WaterLevel === undefined) {
                this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} WaterLevel: ${this.WaterLevel}`);
            }
            else {
                this.humidifierService.updateCharacteristic(this.platform.Characteristic.WaterLevel, this.WaterLevel);
                this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} updateCharacteristic WaterLevel: ${this.WaterLevel}`);
                this.accessory.context.WaterLevel = this.WaterLevel;
            }
        }
        if (this.CurrentHumidifierDehumidifierState === undefined) {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName}` +
                ` CurrentHumidifierDehumidifierState: ${this.CurrentHumidifierDehumidifierState}`);
        }
        else {
            this.humidifierService.updateCharacteristic(this.platform.Characteristic.CurrentHumidifierDehumidifierState, this.CurrentHumidifierDehumidifierState);
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName}` +
                ` updateCharacteristic CurrentHumidifierDehumidifierState: ${this.CurrentHumidifierDehumidifierState}`);
            this.accessory.context.CurrentHumidifierDehumidifierState = this.CurrentHumidifierDehumidifierState;
        }
        if (this.TargetHumidifierDehumidifierState === undefined) {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName}` + ` TargetHumidifierDehumidifierState: ${this.TargetHumidifierDehumidifierState}`);
        }
        else {
            this.humidifierService.updateCharacteristic(this.platform.Characteristic.TargetHumidifierDehumidifierState, this.TargetHumidifierDehumidifierState);
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName}` +
                ` updateCharacteristic TargetHumidifierDehumidifierState: ${this.TargetHumidifierDehumidifierState}`);
            this.accessory.context.TargetHumidifierDehumidifierState = this.TargetHumidifierDehumidifierState;
        }
        if (this.Active === undefined) {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} Active: ${this.Active}`);
        }
        else {
            this.humidifierService.updateCharacteristic(this.platform.Characteristic.Active, this.Active);
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} updateCharacteristic Active: ${this.Active}`);
            this.accessory.context.Active = this.Active;
        }
        if (this.RelativeHumidityHumidifierThreshold === undefined) {
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName}` +
                ` RelativeHumidityHumidifierThreshold: ${this.RelativeHumidityHumidifierThreshold}`);
        }
        else {
            this.humidifierService.updateCharacteristic(this.platform.Characteristic.RelativeHumidityHumidifierThreshold, this.RelativeHumidityHumidifierThreshold);
            this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName}` +
                ` updateCharacteristic RelativeHumidityHumidifierThreshold: ${this.RelativeHumidityHumidifierThreshold}`);
            this.accessory.context.RelativeHumidityHumidifierThreshold = this.RelativeHumidityHumidifierThreshold;
        }
        if (!this.device.humidifier?.hide_temperature && !this.BLE) {
            if (this.CurrentTemperature === undefined) {
                this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} CurrentTemperature: ${this.CurrentTemperature}`);
            }
            else {
                this.temperatureservice?.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.CurrentTemperature);
                this.debugLog(`${this.device.deviceType}: ${this.accessory.displayName} updateCharacteristic CurrentTemperature: ${this.CurrentTemperature}`);
                this.accessory.context.CurrentTemperature = this.CurrentTemperature;
            }
        }
    }
    async stopScanning(switchbot) {
        await switchbot.stopScan();
        if (this.connected) {
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
                    model: 'e',
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
    minStep() {
        if (this.device.humidifier?.set_minStep) {
            this.set_minStep = this.device.humidifier?.set_minStep;
        }
        else {
            this.set_minStep = 1;
        }
        return this.set_minStep;
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
        this.debugWarnLog(`${this.device.deviceType}: ${this.accessory.displayName} offline: ${this.device.offline}`);
        if (this.device.offline) {
            await this.context();
            if (this.CurrentTemperature === undefined) {
                this.CurrentTemperature = 0;
            }
            await this.updateHomeKitCharacteristics();
        }
    }
    async apiError(e) {
        this.humidifierService.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, e);
        if (!this.BLE) {
            this.humidifierService.updateCharacteristic(this.platform.Characteristic.WaterLevel, e);
        }
        this.humidifierService.updateCharacteristic(this.platform.Characteristic.CurrentHumidifierDehumidifierState, e);
        this.humidifierService.updateCharacteristic(this.platform.Characteristic.TargetHumidifierDehumidifierState, e);
        this.humidifierService.updateCharacteristic(this.platform.Characteristic.Active, e);
        this.humidifierService.updateCharacteristic(this.platform.Characteristic.RelativeHumidityHumidifierThreshold, e);
        if (!this.device.humidifier?.hide_temperature && !this.BLE) {
            this.temperatureservice?.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, e);
        }
    }
    async context() {
        if (this.Active === undefined) {
            this.Active = this.platform.Characteristic.Active.ACTIVE;
        }
        else {
            this.Active = this.accessory.context.Active;
        }
        if (this.CurrentTemperature === undefined) {
            this.CurrentTemperature = 30;
        }
        else {
            this.CurrentTemperature = this.accessory.context.CurrentTemperature;
        }
        if (this.CurrentRelativeHumidity === undefined) {
            this.CurrentRelativeHumidity = 0;
        }
        else {
            this.CurrentRelativeHumidity = this.accessory.context.CurrentRelativeHumidity;
        }
        if (this.TargetHumidifierDehumidifierState === undefined) {
            this.TargetHumidifierDehumidifierState = this.platform.Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER;
        }
        else if (this.accessory.context.TargetHumidifierDehumidifierState === undefined) {
            this.TargetHumidifierDehumidifierState = this.platform.Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER;
        }
        else {
            this.TargetHumidifierDehumidifierState = this.accessory.context.TargetHumidifierDehumidifierState;
        }
        if (this.CurrentHumidifierDehumidifierState === undefined) {
            this.CurrentHumidifierDehumidifierState = this.platform.Characteristic.CurrentHumidifierDehumidifierState.INACTIVE;
        }
        else if (this.accessory.context.CurrentHumidifierDehumidifierState === undefined) {
            this.CurrentHumidifierDehumidifierState = this.platform.Characteristic.CurrentHumidifierDehumidifierState.INACTIVE;
        }
        else {
            this.CurrentHumidifierDehumidifierState = this.accessory.context.CurrentHumidifierDehumidifierState;
        }
        if (this.RelativeHumidityHumidifierThreshold === undefined) {
            this.RelativeHumidityHumidifierThreshold = 0;
        }
        else {
            this.RelativeHumidityHumidifierThreshold = this.accessory.context.RelativeHumidityHumidifierThreshold;
        }
        if (this.WaterLevel === undefined) {
            this.WaterLevel = 0;
        }
        else {
            this.WaterLevel = this.accessory.context.WaterLevel;
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
        if (device.humidifier) {
            config = device.humidifier;
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
        if (device.offline !== undefined) {
            config['offline'] = device.offline;
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
    async infoLog(...log) {
        if (this.enablingDeviceLogging()) {
            this.platform.log.info(String(...log));
        }
    }
    async warnLog(...log) {
        if (this.enablingDeviceLogging()) {
            this.platform.log.warn(String(...log));
        }
    }
    async debugWarnLog(...log) {
        if (this.enablingDeviceLogging()) {
            if (this.deviceLogging?.includes('debug')) {
                this.platform.log.warn('[DEBUG]', String(...log));
            }
        }
    }
    async errorLog(...log) {
        if (this.enablingDeviceLogging()) {
            this.platform.log.error(String(...log));
        }
    }
    async debugErrorLog(...log) {
        if (this.enablingDeviceLogging()) {
            if (this.deviceLogging?.includes('debug')) {
                this.platform.log.error('[DEBUG]', String(...log));
            }
        }
    }
    async debugLog(...log) {
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
exports.Humidifier = Humidifier;
//# sourceMappingURL=humidifier.js.map