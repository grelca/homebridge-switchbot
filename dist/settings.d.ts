import { MacAddress, PlatformConfig } from 'homebridge';
import { IClientOptions } from 'async-mqtt';
/**
 * This is the name of the platform that users will use to register the plugin in the Homebridge config.json
 */
export declare const PLATFORM_NAME = "SwitchBot2";
/**
 * This must match the name of your plugin as defined the package.json
 */
export declare const PLUGIN_NAME = "@grelca/homebridge-switchbot";
/**
 * This is the main url used to access SwitchBot API
 */
export declare const Devices = "https://api.switch-bot.com/v1.1/devices";
export interface SwitchBotPlatformConfig extends PlatformConfig {
    credentials?: credentials;
    options?: options | Record<string, never>;
}
export type credentials = {
    token?: any;
    secret?: any;
    notice?: any;
    openToken?: any;
};
export type options = {
    refreshRate?: number;
    pushRate?: number;
    logging?: string;
    devices?: Array<devicesConfig>;
    irdevices?: Array<irDevicesConfig>;
    webhookURL?: string;
    mqttURL?: string;
    mqttOptions?: IClientOptions;
    mqttPubOptions?: IClientOptions;
};
export interface devicesConfig extends device {
    configDeviceType: string;
    configDeviceName?: string;
    deviceId: string;
    external?: boolean;
    refreshRate?: number;
    firmware?: string;
    logging?: string;
    connectionType?: string;
    customBLEaddress?: string;
    scanDuration?: number;
    hide_device?: boolean;
    offline?: boolean;
    maxRetry?: number;
    disableCaching?: boolean;
    mqttURL?: string;
    mqttOptions?: IClientOptions;
    mqttPubOptions?: IClientOptions;
    history?: boolean;
    webhook?: boolean;
    bot?: bot;
    meter?: meter;
    humidifier?: humidifier;
    curtain?: curtain;
    blindTilt?: blindTilt;
    contact?: contact;
    motion?: motion;
    colorbulb?: colorbulb;
    striplight?: striplight;
    ceilinglight?: ceilinglight;
    plug?: Record<any, any>;
    lock?: lock;
    hub?: hub;
}
export type meter = {
    hide_temperature?: boolean;
    hide_humidity?: boolean;
};
export type bot = {
    mode?: string;
    deviceType?: string;
    doublePress?: number;
    pushRatePress?: number;
    allowPush?: boolean;
    multiPress?: boolean;
};
export type humidifier = {
    hide_temperature?: boolean;
    set_minStep?: number;
};
export type curtain = {
    disable_group?: boolean;
    hide_lightsensor?: boolean;
    set_minLux?: number;
    set_maxLux?: number;
    updateRate?: number;
    set_max?: number;
    set_min?: number;
    set_minStep?: number;
    setCloseMode?: string;
    setOpenMode?: string;
};
export type blindTilt = {
    mode?: string;
    hide_lightsensor?: boolean;
    set_minLux?: number;
    set_maxLux?: number;
    updateRate?: number;
    set_max?: number;
    set_min?: number;
    set_minStep?: number;
    setCloseMode?: string;
    setOpenMode?: string;
};
export type contact = {
    hide_lightsensor?: boolean;
    set_minLux?: number;
    set_maxLux?: number;
    hide_motionsensor?: boolean;
};
export type motion = {
    hide_lightsensor?: boolean;
    set_minLux?: number;
    set_maxLux?: number;
};
export type colorbulb = {
    set_minStep?: number;
    adaptiveLightingShift?: number;
};
export type striplight = {
    set_minStep?: number;
    adaptiveLightingShift?: number;
};
export type ceilinglight = {
    set_minStep?: number;
    adaptiveLightingShift?: number;
};
export type lock = {
    hide_contactsensor?: boolean;
    activate_latchbutton?: boolean;
};
export type hub = {
    hide_temperature?: boolean;
    hide_humidity?: boolean;
    hide_lightsensor?: boolean;
};
export interface irDevicesConfig extends irdevice {
    configRemoteType?: string;
    connectionType?: string;
    hide_device?: boolean;
    external?: boolean;
    firmware?: string;
    deviceId: string;
    logging?: string;
    customOn?: string;
    customOff?: string;
    customize?: boolean;
    commandType?: string;
    disablePushOn?: boolean;
    disablePushOff?: boolean;
    disablePushDetail?: boolean;
    irfan?: irfan;
    irair?: irair;
    irpur?: Record<any, any>;
    ircam?: Record<any, any>;
    irlight?: irlight;
    irvc?: Record<any, any>;
    irwh?: Record<any, any>;
    irtv?: Record<any, any>;
    other?: other;
}
export type irfan = {
    swing_mode?: boolean;
    rotation_speed?: boolean;
    set_minStep?: number;
    set_max?: number;
    set_min?: number;
};
export type irlight = {
    stateless?: boolean;
};
export type irair = {
    hide_automode?: boolean;
    meterType?: string;
    meterId?: string;
    meterUuid?: string;
};
export type other = {
    deviceType?: string;
};
export type body = {
    command: string;
    parameter: string;
    commandType: string;
};
export type deviceList = {
    device: Array<device>;
};
export type device = {
    deviceId?: string;
    deviceName: string;
    deviceType: string;
    enableCloudService: boolean;
    hubDeviceId: string;
    curtainDevicesIds?: Array<string>;
    blindTiltDevicesIds?: Array<string>;
    calibrate?: boolean;
    group?: boolean;
    master?: boolean;
    openDirection?: string;
    direction?: string;
    slidePosition?: string;
    version?: number;
    bleMac?: string;
};
export type infraredRemoteList = {
    device: Array<irdevice>;
};
export type irdevice = {
    deviceId?: string;
    deviceName: string;
    remoteType: string;
    hubDeviceId: string;
};
export type deviceStatus = {
    deviceId: string;
    deviceType: string;
    hubDeviceId: string;
    power?: string;
    calibrate?: boolean;
    group?: boolean;
    moving?: boolean;
    slidePosition?: number;
    temperature?: number;
    humidity?: number;
    lockState?: string;
    doorState?: string;
    moveDetected?: boolean;
    brightness?: string | number;
    openState?: string;
    colorTemperature?: number;
    voltage?: number;
    weight?: number;
    electricityOfDay?: number;
    electricCurrent?: number;
    color?: string;
    workingStatus?: string;
    onlineStatus?: string;
    battery?: number;
    deviceName?: string;
    nebulizationEfficiency?: number;
    auto?: boolean;
    childLock?: boolean;
    sound?: boolean;
    lackWater?: boolean;
    version?: number;
    direction?: string;
    runStatus?: string;
    mode?: number;
    speed?: number;
    shaking?: boolean;
    shakeCenter?: string;
    shakeRange?: string;
};
export type ad = {
    id: string;
    address: string;
    rssi: number;
    serviceData: serviceData;
};
export type serviceData = {
    model: string;
    modelName: string;
    mode?: boolean;
    state?: string | boolean;
    door_open?: string;
    status?: string;
    power?: boolean;
    red?: number;
    green?: number;
    blue?: number;
    color_temperature?: number;
    battery?: number;
    percentage?: boolean | string;
    onState?: boolean;
    autoMode?: boolean;
    temperature?: temperature;
    fahrenheit: boolean;
    humidity?: number;
    movement?: boolean;
    lightLevel?: number | string | boolean;
    doorState?: number | string;
    calibration?: boolean;
    position?: number;
    inMotion?: boolean;
    delay?: boolean;
    timer?: boolean;
    syncUtcTime?: boolean;
    wifiRssi?: number;
    overload?: boolean;
    currentPower?: number;
    brightness?: boolean | string;
};
export type temperature = {
    c: number;
    f: number;
};
export type switchbot = {
    discover: (arg0: {
        duration?: any;
        model: string;
        quick: boolean;
        id?: MacAddress;
    }) => Promise<any>;
    wait: (arg0: number) => any;
};
export declare function rgb2hs(r: any, g: any, b: any): number[];
export declare function hs2rgb(h: any, s: any): number[];
export declare function k2rgb(k: number): any;
export declare function m2hs(m: any): number[];
//# sourceMappingURL=settings.d.ts.map