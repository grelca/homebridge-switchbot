/// <reference types="node" />
import { MqttClient } from 'mqtt';
import * as http from 'http';
import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, Service, Characteristic } from 'homebridge';
import { device, SwitchBotPlatformConfig, devicesConfig, irDevicesConfig } from './settings';
/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export declare class SwitchBotPlatform implements DynamicPlatformPlugin {
    readonly log: Logger;
    readonly config: SwitchBotPlatformConfig;
    readonly api: API;
    readonly Service: typeof Service;
    readonly Characteristic: typeof Characteristic;
    readonly accessories: PlatformAccessory[];
    version: string;
    debugMode: boolean;
    platformLogging?: string;
    webhookEventListener: http.Server | null;
    mqttClient: MqttClient | null;
    readonly fakegatoAPI: any;
    readonly eve: any;
    readonly webhookEventHandler: {
        [x: string]: (context: {
            [x: string]: any;
        }) => void;
    };
    constructor(log: Logger, config: SwitchBotPlatformConfig, api: API);
    setupMqtt(): Promise<void>;
    setupwebhook(): Promise<void>;
    /**
     * This function is invoked when homebridge restores cached accessories from disk at startup.
     * It should be used to setup event handlers for characteristics and update respective values.
     */
    configureAccessory(accessory: PlatformAccessory): void;
    /**
     * Verify the config passed to the plugin is valid
     */
    verifyConfig(): Promise<void>;
    /**
     * The openToken was old config.
     * This method saves the openToken as the token in the config.json file
     * @param this.config.credentials.openToken
     */
    updateToken(): Promise<void>;
    generateHeaders: () => {
        Authorization: any;
        sign: string;
        nonce: `${string}-${string}-${string}-${string}-${string}`;
        t: string;
        'Content-Type': string;
    };
    /**
     * this method discovers devices
     *
        const t = `${Date.now()}`;
        const nonce = 'requestID';
        const data = this.config.credentials?.token + t + nonce;
        const signTerm = crypto.createHmac('sha256', this.config.credentials?.secret).update(Buffer.from(data, 'utf-8')).digest();
        const sign = signTerm.toString('base64');
     */
    discoverDevices(): Promise<void>;
    private createDevice;
    private createIRDevice;
    private createHumidifier;
    private createBot;
    private createMeter;
    private createMeterPlus;
    private createHub2;
    private createIOSensor;
    private createMotion;
    private createContact;
    private createBlindTilt;
    private createCurtain;
    private createPlug;
    private createLock;
    private createColorBulb;
    private createCeilingLight;
    private createStripLight;
    private createRobotVacuumCleaner;
    private createTV;
    private createFan;
    private createLight;
    private createAirConditioner;
    private createAirPurifier;
    private createWaterHeater;
    private createVacuumCleaner;
    private createCamera;
    private createOthers;
    registerCurtains(device: device & devicesConfig): Promise<boolean>;
    connectionType(device: device & devicesConfig): Promise<any>;
    registerDevice(device: device & devicesConfig): Promise<boolean>;
    externalOrPlatformIR(device: device & irDevicesConfig, accessory: PlatformAccessory): Promise<void>;
    externalOrPlatform(device: device & devicesConfig, accessory: PlatformAccessory): Promise<void>;
    externalAccessory(accessory: PlatformAccessory): Promise<void>;
    unregisterPlatformAccessories(existingAccessory: PlatformAccessory): void;
    statusCode(statusCode: number): Promise<void>;
    connectBLE(): any;
    logs(): void;
    /**
     * If device level logging is turned on, log to log.warn
     * Otherwise send debug logs to log.debug
     */
    infoLog(...log: any[]): void;
    warnLog(...log: any[]): void;
    debugWarnLog(...log: any[]): void;
    errorLog(...log: any[]): void;
    debugErrorLog(...log: any[]): void;
    debugLog(...log: any[]): void;
    enablingPlatfromLogging(): boolean;
}
//# sourceMappingURL=platform.d.ts.map