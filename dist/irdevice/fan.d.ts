import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import { SwitchBotPlatform } from '../platform';
import { irDevicesConfig, irdevice } from '../settings';
/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export declare class Fan {
    private readonly platform;
    private accessory;
    device: irdevice & irDevicesConfig;
    fanService: Service;
    Active: CharacteristicValue;
    SwingMode: CharacteristicValue;
    RotationSpeed: CharacteristicValue;
    FirmwareRevision: CharacteristicValue;
    ActiveIdentifier: CharacteristicValue;
    RotationDirection: CharacteristicValue;
    minStep?: number;
    minValue?: number;
    maxValue?: number;
    deviceLogging: string;
    disablePushOn?: boolean;
    disablePushOff?: boolean;
    constructor(platform: SwitchBotPlatform, accessory: PlatformAccessory, device: irdevice & irDevicesConfig);
    SwingModeSet(value: CharacteristicValue): Promise<void>;
    RotationSpeedSet(value: CharacteristicValue): Promise<void>;
    ActiveSet(value: CharacteristicValue): Promise<void>;
    /**
     * Pushes the requested changes to the SwitchBot API
     * deviceType	commandType     Command	          command parameter	         Description
     * Fan -        "command"       "swing"          "default"	        =        swing
     * Fan -        "command"       "timer"          "default"	        =        timer
     * Fan -        "command"       "lowSpeed"       "default"	        =        fan speed to low
     * Fan -        "command"       "middleSpeed"    "default"	        =        fan speed to medium
     * Fan -        "command"       "highSpeed"      "default"	        =        fan speed to high
     */
    pushFanOnChanges(): Promise<void>;
    pushFanOffChanges(): Promise<void>;
    pushFanSpeedUpChanges(): Promise<void>;
    pushFanSpeedDownChanges(): Promise<void>;
    pushFanSwingChanges(): Promise<void>;
    pushChanges(bodyChange: any): Promise<void>;
    updateHomeKitCharacteristics(): Promise<void>;
    disablePushOnChanges(device: irdevice & irDevicesConfig): Promise<void>;
    disablePushOffChanges(device: irdevice & irDevicesConfig): Promise<void>;
    commandType(): Promise<string>;
    commandOn(): Promise<string>;
    commandOff(): Promise<string>;
    statusCode(statusCode: number): Promise<void>;
    apiError(e: any): Promise<void>;
    context(): Promise<void>;
    config(device: irdevice & irDevicesConfig): Promise<void>;
    logs(device: irdevice & irDevicesConfig): Promise<void>;
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
//# sourceMappingURL=fan.d.ts.map