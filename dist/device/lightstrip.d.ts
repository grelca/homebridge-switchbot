import { Subject } from 'rxjs';
import { SwitchBotPlatform } from '../platform';
import { Service, PlatformAccessory, CharacteristicValue, ControllerConstructor, Controller, ControllerServiceMap } from 'homebridge';
import { device, devicesConfig, deviceStatus, serviceData } from '../settings';
/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export declare class StripLight {
    private readonly platform;
    private accessory;
    device: device & devicesConfig;
    lightBulbService: Service;
    On: CharacteristicValue;
    Hue: CharacteristicValue;
    Saturation: CharacteristicValue;
    Brightness: CharacteristicValue;
    FirmwareRevision: CharacteristicValue;
    ColorTemperature?: CharacteristicValue;
    OpenAPI_On: deviceStatus['power'];
    OpenAPI_RGB: deviceStatus['color'];
    OpenAPI_Brightness: deviceStatus['brightness'];
    OpenAPI_FirmwareRevision: deviceStatus['version'];
    BLE_On: serviceData['state'];
    BLE_Brightness: serviceData['brightness'];
    BLE_IsConnected?: boolean;
    set_minStep?: number;
    scanDuration: number;
    deviceLogging: string;
    deviceRefreshRate: number;
    adaptiveLightingShift?: number;
    AdaptiveLightingController?: ControllerConstructor | Controller<ControllerServiceMap>;
    minKelvin: number;
    maxKelvin: number;
    cacheKelvin: number;
    change: string;
    stripLightUpdateInProgress: boolean;
    doStripLightUpdate: Subject<void>;
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
     * Pushes the requested changes to the SwitchBot API
     * deviceType	      commandType	          Command	               command parameter	                     Description
     * Strip Light  -    "command"            "turnOn"                   "default"                =        set to ON state |
     * Strip Light  -    "command"           "turnOff"                   "default"                =        set to OFF state |
     * Strip Light  -    "command"            "toggle"                   "default"                =        toggle state |
     * Strip Light  -    "command"        "setBrightness"               "`{1-100}`"               =        set brightness |
     * Strip Light  -    "command"          "setColor"           "`"{0-255}:{0-255}:{0-255}"`"    =        set RGB color value |
     *
     */
    pushChanges(): Promise<void>;
    BLEpushChanges(): Promise<void>;
    BLEpushBrightnessChanges(): Promise<void>;
    BLEpushRGBChanges(): Promise<void>;
    openAPIpushChanges(): Promise<void>;
    pushHueSaturationChanges(): Promise<void>;
    pushBrightnessChanges(): Promise<void>;
    /**
     * Handle requests to set the value of the "On" characteristic
     */
    OnSet(value: CharacteristicValue): Promise<void>;
    /**
     * Handle requests to set the value of the "Brightness" characteristic
     */
    BrightnessSet(value: CharacteristicValue): Promise<void>;
    /**
     * Handle requests to set the value of the "ColorTemperature" characteristic
     */
    ColorTemperatureSet(value: CharacteristicValue): Promise<void>;
    /**
     * Handle requests to set the value of the "Hue" characteristic
     */
    HueSet(value: CharacteristicValue): Promise<void>;
    /**
     * Handle requests to set the value of the "Saturation" characteristic
     */
    SaturationSet(value: CharacteristicValue): Promise<void>;
    updateHomeKitCharacteristics(): Promise<void>;
    stopScanning(switchbot: any): Promise<void>;
    getCustomBLEAddress(switchbot: any): Promise<void>;
    BLEPushConnection(): Promise<void>;
    BLERefreshConnection(switchbot: any): Promise<void>;
    retry({ max, fn }: {
        max: number;
        fn: {
            (): any;
            (): Promise<any>;
        };
    }): Promise<null>;
    maxRetry(): number;
    minStep(device: device & devicesConfig): number;
    adaptiveLighting(device: device & devicesConfig): Promise<void>;
    scan(device: device & devicesConfig): Promise<void>;
    statusCode(statusCode: number): Promise<void>;
    offlineOff(): Promise<void>;
    apiError(e: any): void;
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
//# sourceMappingURL=lightstrip.d.ts.map