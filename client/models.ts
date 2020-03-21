export interface EdgeImpulseSettings {
    apiKey: string;
    device: DeviceSettings;
}

export interface DeviceSettings {
    deviceId: string;
    deviceType: string;
    sensors: {
        name: string;
        frequencies: number[];
        maxSampleLength: number;
    }[];
}

export type Measurement = number[];
export type Measurements = Measurement[];
export type Sample = {
    measurements: Measurements,
    intervalValues: number[]
}

export interface SampleDetails {
    label: string;
    length: number;
    path: string;
    hmacKey: string;
    interval: number;
    sensor: string;
}
