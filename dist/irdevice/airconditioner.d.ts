import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import { SwitchBotPlatform } from '../platform';
import { irDevicesConfig, irdevice } from '../settings';
/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export declare class AirConditioner {
    private readonly platform;
    private accessory;
    device: irdevice & irDevicesConfig;
    coolerService: Service;
    Active: CharacteristicValue;
    RotationSpeed: CharacteristicValue;
    FirmwareRevision: CharacteristicValue;
    CurrentTemperature: CharacteristicValue;
    ThresholdTemperature: CharacteristicValue;
    CurrentRelativeHumidity?: CharacteristicValue;
    TargetHeaterCoolerState: CharacteristicValue;
    CurrentHeaterCoolerState: CharacteristicValue;
    state: string;
    Busy: any;
    Timeout: any;
    CurrentMode: number;
    ValidValues: number[];
    CurrentFanSpeed: number;
    static MODE_AUTO: number;
    static MODE_COOL: number;
    static MODE_HEAT: number;
    deviceLogging: string;
    hide_automode?: boolean;
    disablePushOn?: boolean;
    disablePushOff?: boolean;
    meter?: PlatformAccessory;
    disablePushDetail?: boolean;
    private readonly valid12;
    private readonly valid012;
    constructor(platform: SwitchBotPlatform, accessory: PlatformAccessory, device: irdevice & irDevicesConfig);
    /**
     * Pushes the requested changes to the SwitchBot API
     * deviceType				commandType     Command	          command parameter	         Description
     * AirConditioner:        "command"       "swing"          "default"	        =        swing
     * AirConditioner:        "command"       "timer"          "default"	        =        timer
     * AirConditioner:        "command"       "lowSpeed"       "default"	        =        fan speed to low
     * AirConditioner:        "command"       "middleSpeed"    "default"	        =        fan speed to medium
     * AirConditioner:        "command"       "highSpeed"      "default"	        =        fan speed to high
     */
    pushAirConditionerOnChanges(): Promise<void>;
    pushAirConditionerOffChanges(): Promise<void>;
    pushAirConditionerStatusChanges(): Promise<void>;
    pushAirConditionerDetailsChanges(): Promise<void>;
    private UpdateCurrentHeaterCoolerState;
    pushChanges(bodyChange: any): Promise<void>;
    CurrentTemperatureGet(): Promise<CharacteristicValue>;
    CurrentRelativeHumidityGet(): Promise<CharacteristicValue>;
    RotationSpeedGet(): Promise<number>;
    RotationSpeedSet(value: CharacteristicValue): Promise<void>;
    ActiveSet(value: CharacteristicValue): Promise<void>;
    TargetHeaterCoolerStateGet(): Promise<CharacteristicValue>;
    TargetHeaterCoolerStateSet(value: CharacteristicValue): Promise<void>;
    TargetHeaterCoolerStateAUTO(): Promise<void>;
    TargetHeaterCoolerStateCOOL(): Promise<void>;
    TargetHeaterCoolerStateHEAT(): Promise<void>;
    CurrentHeaterCoolerStateGet(): Promise<CharacteristicValue>;
    private getTargetHeaterCoolerStateName;
    ThresholdTemperatureGet(): Promise<CharacteristicValue>;
    ThresholdTemperatureSet(value: CharacteristicValue): Promise<void>;
    updateHomeKitCharacteristics(): Promise<void>;
    disablePushOnChanges(device: irdevice & irDevicesConfig): Promise<void>;
    disablePushOffChanges(device: irdevice & irDevicesConfig): Promise<void>;
    disablePushDetailChanges(device: irdevice & irDevicesConfig): Promise<void>;
    commandType(): Promise<string>;
    commandOn(): Promise<string>;
    commandOff(): Promise<string>;
    statusCode(statusCode: number): Promise<void>;
    apiError({ e }: {
        e: any;
    }): Promise<void>;
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
//# sourceMappingURL=airconditioner.d.ts.map