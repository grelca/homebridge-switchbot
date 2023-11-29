import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import { SwitchBotPlatform } from '../platform';
import { irDevicesConfig, irdevice } from '../settings';
/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export declare class TV {
    private readonly platform;
    private accessory;
    device: irdevice & irDevicesConfig;
    tvService: Service;
    speakerService: Service;
    Active: CharacteristicValue;
    ActiveIdentifier: CharacteristicValue;
    FirmwareRevision: CharacteristicValue;
    deviceLogging: string;
    disablePushOn?: boolean;
    disablePushOff?: boolean;
    disablePushDetail?: boolean;
    constructor(platform: SwitchBotPlatform, accessory: PlatformAccessory, device: irdevice & irDevicesConfig);
    VolumeSelectorSet(value: CharacteristicValue): Promise<void>;
    RemoteKeySet(value: CharacteristicValue): Promise<void>;
    ActiveIdentifierSet(value: CharacteristicValue): Promise<void>;
    ActiveSet(value: CharacteristicValue): Promise<void>;
    /**
     * Pushes the requested changes to the SwitchBot API
     * deviceType	  commandType     Command           Parameter	        Description
     * TV           "command"       "turnOff"         "default"	        set to OFF state
     * TV           "command"       "turnOn"          "default"	        set to ON state
     * TV           "command"       "volumeAdd"       "default"	        volume up
     * TV           "command"       "volumeSub"       "default"	        volume down
     * TV           "command"       "channelAdd"      "default"	        next channel
     * TV           "command"       "channelSub"      "default"	        previous channel
     */
    pushTvOnChanges(): Promise<void>;
    pushTvOffChanges(): Promise<void>;
    pushOkChanges(): Promise<void>;
    pushBackChanges(): Promise<void>;
    pushMenuChanges(): Promise<void>;
    pushUpChanges(): Promise<void>;
    pushDownChanges(): Promise<void>;
    pushRightChanges(): Promise<void>;
    pushLeftChanges(): Promise<void>;
    pushVolumeUpChanges(): Promise<void>;
    pushVolumeDownChanges(): Promise<void>;
    pushTVChanges(bodyChange: any): Promise<void>;
    updateHomeKitCharacteristics(): Promise<void>;
    disablePushOnChanges(device: irdevice & irDevicesConfig): Promise<void>;
    disablePushOffChanges(device: irdevice & irDevicesConfig): Promise<void>;
    disablePushDetailChanges(device: irdevice & irDevicesConfig): Promise<void>;
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
//# sourceMappingURL=tv.d.ts.map