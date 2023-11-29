import { Subject } from 'rxjs';
import { SwitchBotPlatform } from '../platform';
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { device, devicesConfig, deviceStatus, serviceData } from '../settings';
export declare class RobotVacuumCleaner {
    private readonly platform;
    private accessory;
    device: device & devicesConfig;
    batteryService: Service;
    robotVacuumCleanerService: Service;
    On: CharacteristicValue;
    Brightness: CharacteristicValue;
    BatteryLevel: CharacteristicValue;
    StatusLowBattery: CharacteristicValue;
    FirmwareRevision: CharacteristicValue;
    OpenAPI_On: deviceStatus['power'];
    OpenAPI_BatteryLevel: deviceStatus['battery'];
    OpenAPI_FirmwareRevision: deviceStatus['version'];
    BLE_On: serviceData['state'];
    BLE_IsConnected?: boolean;
    scanDuration: number;
    deviceLogging: string;
    deviceRefreshRate: number;
    robotVacuumCleanerUpdateInProgress: boolean;
    doRobotVacuumCleanerUpdate: Subject<void>;
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
     * deviceType	              commandType	    Command	    parameter	        Description
     * Robot Vacuum Cleaner S1   "command"     "start"      "default"	  =     start vacuuming
     * Robot Vacuum Cleaner S1   "command"     "stop"       "default"	  =     stop vacuuming
     * Robot Vacuum Cleaner S1   "command"     "dock"       "default"   =     return to charging dock
     * Robot Vacuum Cleaner S1   "command"     "PowLevel"   "{0-3}"     =     set suction power level: 0 (Quiet), 1 (Standard), 2 (Strong), 3 (MAX)
     */
    pushChanges(): Promise<void>;
    BLEpushChanges(): Promise<void>;
    openAPIpushChanges(): Promise<void>;
    openAPIpushBrightnessChanges(): Promise<void>;
    private commands;
    private brightnessCommands;
    /**
     * Handle requests to set the value of the "On" characteristic
     */
    OnSet(value: CharacteristicValue): Promise<void>;
    /**
     * Handle requests to set the value of the "Brightness" characteristic
     */
    BrightnessSet(value: CharacteristicValue): Promise<void>;
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
//# sourceMappingURL=robotvacuumcleaner.d.ts.map