import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import { SwitchBotPlatform } from '../platform';
import { irDevicesConfig, irdevice } from '../settings';
/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export declare class WaterHeater {
    private readonly platform;
    private accessory;
    device: irdevice & irDevicesConfig;
    valveService: Service;
    Active: CharacteristicValue;
    FirmwareRevision: CharacteristicValue;
    deviceLogging: string;
    disablePushOn?: boolean;
    disablePushOff?: boolean;
    constructor(platform: SwitchBotPlatform, accessory: PlatformAccessory, device: irdevice & irDevicesConfig);
    ActiveSet(value: CharacteristicValue): Promise<void>;
    /**
     * Pushes the requested changes to the SwitchBot API
     * deviceType	     Command Type    Command	         Parameter	       Description
     * WaterHeater     "command"       "turnOff"         "default"	       set to OFF state
     * WaterHeater     "command"       "turnOn"          "default"	       set to ON state
     */
    pushWaterHeaterOnChanges(): Promise<void>;
    pushWaterHeaterOffChanges(): Promise<void>;
    pushChanges(bodyChange: any): Promise<void>;
    updateHomeKitCharacteristics(): Promise<void>;
    disablePushOnChanges(device: irdevice & irDevicesConfig): Promise<void>;
    disablePushOffChanges(device: irdevice & irDevicesConfig): Promise<void>;
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
//# sourceMappingURL=waterheater.d.ts.map