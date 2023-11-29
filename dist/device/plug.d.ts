import { Subject } from 'rxjs';
import { SwitchBotPlatform } from '../platform';
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { device, devicesConfig, deviceStatus, serviceData } from '../settings';
export declare class Plug {
    private readonly platform;
    private accessory;
    device: device & devicesConfig;
    outletService: Service;
    On: CharacteristicValue;
    FirmwareRevision: CharacteristicValue;
    OpenAPI_On: deviceStatus['power'];
    OpenAPI_FirmwareRevision: deviceStatus['version'];
    BLE_IsConnected?: boolean;
    BLE_On: serviceData['state'];
    scanDuration: number;
    deviceLogging: string;
    deviceRefreshRate: number;
    plugUpdateInProgress: boolean;
    doPlugUpdate: Subject<void>;
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
     * deviceType	commandType	  Command	    command parameter	  Description
     * Plug               -    "command"     "turnOff"   "default"	  =        set to OFF state
     * Plug               -    "command"     "turnOn"    "default"	  =        set to ON state
     * Plug Mini (US/JP)  -    "command"      turnOn      default     =        set to ON state
     * Plug Mini (US/JP)  -    "command"      turnOff     default     =        set to OFF state
     * Plug Mini (US/JP)  -    "command"      toggle      default     =        toggle state
     */
    pushChanges(): Promise<void>;
    BLEpushChanges(): Promise<void>;
    openAPIpushChanges(): Promise<void>;
    /**
     * Handle requests to set the value of the "On" characteristic
     */
    OnSet(value: CharacteristicValue): Promise<void>;
    updateHomeKitCharacteristics(): Promise<void>;
    stopScanning(switchbot: any): Promise<void>;
    BLEmodel(): 'g' | 'j';
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
    model(device: device & devicesConfig): string;
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
//# sourceMappingURL=plug.d.ts.map