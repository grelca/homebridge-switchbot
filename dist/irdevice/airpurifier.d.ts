import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import { SwitchBotPlatform } from '../platform';
import { irDevicesConfig, irdevice } from '../settings';
/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export declare class AirPurifier {
    private readonly platform;
    private accessory;
    device: irdevice & irDevicesConfig;
    airPurifierService: Service;
    Active: CharacteristicValue;
    APActive: CharacteristicValue;
    CurrentAPTemp: CharacteristicValue;
    CurrentAPMode: CharacteristicValue;
    RotationSpeed: CharacteristicValue;
    FirmwareRevision: CharacteristicValue;
    CurrentAPFanSpeed: CharacteristicValue;
    CurrentTemperature: CharacteristicValue;
    CurrentAirPurifierState: CharacteristicValue;
    CurrentHeaterCoolerState: CharacteristicValue;
    Busy: any;
    Timeout: any;
    static IDLE: number;
    CurrentMode: number;
    static INACTIVE: number;
    LastTemperature: number;
    CurrentFanSpeed: number;
    static PURIFYING_AIR: number;
    disablePushOn?: boolean;
    disablePushOff?: boolean;
    deviceLogging: string;
    constructor(platform: SwitchBotPlatform, accessory: PlatformAccessory, device: irdevice & irDevicesConfig);
    ActiveSet(value: CharacteristicValue): Promise<void>;
    TargetAirPurifierStateSet(value: CharacteristicValue): Promise<void>;
    CurrentAirPurifierStateGet(): Promise<number>;
    /**
     * Pushes the requested changes to the SwitchBot API
     * deviceType				commandType     Command	          command parameter	         Description
     * AirPurifier:        "command"       "turnOn"         "default"	        =        every home appliance can be turned on by default
     * AirPurifier:        "command"       "turnOff"        "default"	        =        every home appliance can be turned off by default
     * AirPurifier:        "command"       "swing"          "default"	        =        swing
     * AirPurifier:        "command"       "timer"          "default"	        =        timer
     * AirPurifier:        "command"       "lowSpeed"       "default"	        =        fan speed to low
     * AirPurifier:        "command"       "middleSpeed"    "default"	        =        fan speed to medium
     * AirPurifier:        "command"       "highSpeed"      "default"	        =        fan speed to high
     */
    pushAirPurifierOnChanges(): Promise<void>;
    pushAirPurifierOffChanges(): Promise<void>;
    pushAirPurifierStatusChanges(): Promise<void>;
    pushAirPurifierDetailsChanges(): Promise<void>;
    pushChanges(bodyChange: any): Promise<void>;
    updateHomeKitCharacteristics(): Promise<void>;
    disablePushOnChanges(device: irdevice & irDevicesConfig): Promise<void>;
    disablePushOffChanges(device: irdevice & irDevicesConfig): Promise<void>;
    commandType(): Promise<string>;
    commandOn(): Promise<string>;
    commandOff(): Promise<string>;
    statusCode(statusCode: number): Promise<void>;
    apiError(e: any): Promise<void>;
    private context;
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
//# sourceMappingURL=airpurifier.d.ts.map