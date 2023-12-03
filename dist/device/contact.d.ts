import { Subject } from 'rxjs';
import { SwitchBotPlatform } from '../platform';
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { device, devicesConfig, serviceData, deviceStatus } from '../settings';
/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export declare class Contact {
    private readonly platform;
    private accessory;
    device: device & devicesConfig;
    motionService?: Service;
    batteryService: Service;
    lightSensorService?: Service;
    contactSensorservice: Service;
    BatteryLevel: CharacteristicValue;
    MotionDetected: CharacteristicValue;
    StatusLowBattery: CharacteristicValue;
    FirmwareRevision: CharacteristicValue;
    ContactSensorState: CharacteristicValue;
    CurrentAmbientLightLevel: CharacteristicValue;
    OpenAPI_BatteryLevel: deviceStatus['battery'];
    OpenAPI_FirmwareRevision: deviceStatus['version'];
    OpenAPI_MotionDetected: deviceStatus['moveDetected'];
    OpenAPI_ContactSensorState: deviceStatus['openState'];
    OpenAPI_CurrentAmbientLightLevel: deviceStatus['brightness'];
    BLE_BateryLevel: serviceData['battery'];
    BLE_MotionDetected: serviceData['movement'];
    BLE_ContactSensorState: serviceData['doorState'];
    BLE_CurrentAmbientLightLevel: serviceData['lightLevel'];
    scanning: boolean;
    BLE_IsConnected?: boolean;
    set_minLux: number;
    set_maxLux: number;
    scanDuration: number;
    deviceLogging: string;
    deviceRefreshRate: number;
    contactUbpdateInProgress: boolean;
    doContactUpdate: Subject<void>;
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
    stopScanning(switchbot: any): Promise<void>;
    getCustomBLEAddress(switchbot: any): Promise<void>;
    BLERefreshConnection(switchbot: any): Promise<void>;
    minLux(): number;
    maxLux(): number;
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
//# sourceMappingURL=contact.d.ts.map