export interface EdgeImpulseSettings {
  apiKey: string;
  device: DeviceSettings;
}

export interface DeviceSettings {
  deviceId: string;
  deviceType: string;
  accelerometerInterval: number;
}

export type Measurement = number[];
export type Measurements = Measurement[];

export interface SampleDetails {
  label: string;
  length: number;
  path: string;
  hmacKey: string;
  interval: number;
  sensor: string;
}
