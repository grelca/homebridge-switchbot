import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import { MqttClient } from 'mqtt';
import { SwitchBotPlatform } from '../platform';
import { device, deviceStatus, devicesConfig, serviceData, temperature } from '../settings';
export declare class Meter {
    private readonly platform;
    private accessory;
    device: device & devicesConfig;
    batteryService: Service;
    humidityService?: Service;
    temperatureService?: Service;
    BatteryLevel: CharacteristicValue;
    FirmwareRevision: CharacteristicValue;
    StatusLowBattery: CharacteristicValue;
    CurrentTemperature?: CharacteristicValue;
    CurrentRelativeHumidity?: CharacteristicValue;
    OpenAPI_BatteryLevel: deviceStatus['battery'];
    OpenAPI_FirmwareRevision: deviceStatus['version'];
    OpenAPI_CurrentTemperature: deviceStatus['temperature'];
    OpenAPI_CurrentRelativeHumidity: deviceStatus['humidity'];
    BLE_Celsius: temperature['c'];
    BLE_Fahrenheit: temperature['f'];
    BLE_BatteryLevel: serviceData['battery'];
    BLE_CurrentTemperature: serviceData['temperature'];
    BLE_CurrentRelativeHumidity: serviceData['humidity'];
    BLE_IsConnected?: boolean;
    mqttClient: MqttClient | null;
    historyService?: any;
    scanDuration: number;
    deviceLogging: string;
    deviceRefreshRate: number;
    private readonly BLE;
    private readonly OpenAPI;
    constructor(platform: SwitchBotPlatform, accessory: PlatformAccessory, device: device & devicesConfig);
    /**
     * Parse the device status from the SwitchBot api
     */
    parseStatus(): Promise<void>;
    BLEparseStatus(): Promise<void>;
    openAPIparseStatus(): Promise<void>;
    /**
     * Asks the SwitchBot API for the latest device information
     */
    refreshStatus(): Promise<void>;
    BLERefreshStatus(): Promise<void>;
    openAPIRefreshStatus(): Promise<void>;
    /**
     * Updates the status for each of the HomeKit Characteristics
     */
    updateHomeKitCharacteristics(): Promise<void>;
    mqttPublish(message: any): void;
    setupMqtt(device: device & devicesConfig): Promise<void>;
    setupHistoryService(device: device & devicesConfig): Promise<void>;
    stopScanning(switchbot: any): Promise<void>;
    getCustomBLEAddress(switchbot: any): Promise<void>;
    BLERefreshConnection(switchbot: any): Promise<void>;
    scan(device: device & devicesConfig): Promise<void>;
    statusCode(statusCode: number): Promise<void>;
    offlineOff(): Promise<void>;
    apiError(e: any): Promise<void>;
    context(): Promise<void>;
    refreshRate(device: device & devicesConfig): Promise<void>;
    config(device: device & devicesConfig): Promise<void>;
    logs(device: device & devicesConfig): Promise<void>;
    /**
     * Logging for Device
     */
    infoLog(...log: any[]): void;
    warnLog(...log: any[]): void;
    debugWarnLog(...log: any[]): void;
    errorLog(...log: any[]): void;
    debugErrorLog(...log: any[]): void;
    debugLog(...log: any[]): void;
    enablingDeviceLogging(): boolean;
}
//# sourceMappingURL=meter.d.ts.map