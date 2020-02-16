import { DEVICE_ID, DEVICE_TYPE, INTERVAL_MS } from "./constants";

export type Measurement = number[];
export type Measurements = Measurement[];

export type DataMessage = {
  protected: {
    ver: string;
    alg: string;
    iat: number;
  };
  signature: string;
  payload: {
    device_name: string;
    device_type: string;
    interval_ms: number;
    sensors: {
      name: string;
      units: string;
    }[];
    values: Measurements;
  };
};

const emptySignature = Array(64)
  .fill("0")
  .join("");

export const dataMessage = (measurements: Measurements): DataMessage => {
  return {
    protected: {
      ver: "v1",
      alg: "HS256",
      iat: Math.floor(Date.now() / 1000) // epoch time, seconds since 1970
    },
    signature: emptySignature,
    payload: {
      device_name: DEVICE_ID, // eslint-disable-line @typescript-eslint/camelcase
      device_type: DEVICE_TYPE, // eslint-disable-line @typescript-eslint/camelcase
      interval_ms: INTERVAL_MS, // eslint-disable-line @typescript-eslint/camelcase
      sensors: [
        { name: "accX", units: "m/s2" },
        { name: "accY", units: "m/s2" },
        { name: "accZ", units: "m/s2" }
      ],
      values: measurements
    }
  };
};

export const helloMessage = (apiKey: string) => {
  return {
    hello: {
      version: 2,
      apiKey: apiKey,
      deviceId: DEVICE_ID,
      deviceType: DEVICE_TYPE,
      connection: "ip",
      sensors: [
        {
          name: "Built-in accelerometer",
          maxSampleLengthS: 300,
          frequencies: [62.5]
        }
      ]
    }
  };
};

export const sampleRequestReceived = {
  sample: true
};
export const sampleRequestFailed = (error: string) => {
  return {
    sample: false,
    error: error
  };
};
export const sampleProcessing = {
  sampleProcessing: true
};
export const sampleUploading = {
  sampleUploading: true
};
export const sampleFinished = {
  sampleFinished: true
};
