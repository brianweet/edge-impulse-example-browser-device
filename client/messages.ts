import {
    EdgeImpulseSettings,
    Measurements
} from "./models";

const emptySignature = Array(64)
    .fill("0")
    .join("");

export const dataMessage = (
    settings: EdgeImpulseSettings,
    measurements: Measurements
) => {
    return {
        protected: {
            ver: "v1",
            alg: "HS256",
            iat: Math.floor(Date.now() / 1000) // epoch time, seconds since 1970
        },
        signature: emptySignature,
        payload: {
            device_name: settings.device.deviceId,
            device_type: settings.device.deviceType,
            interval_ms: 16,
            sensors: [{
                    name: "accX",
                    units: "m/s2"
                },
                {
                    name: "accY",
                    units: "m/s2"
                },
                {
                    name: "accZ",
                    units: "m/s2"
                }
            ],
            values: measurements
        }
    };
};

export const helloMessage = (settings: EdgeImpulseSettings) => {
    return {
        hello: {
            version: 2,
            apiKey: settings.apiKey,
            deviceId: settings.device.deviceId,
            deviceType: settings.device.deviceType,
            connection: "ip",
            sensors: settings.device.sensors.map(s => {
                return {
                    name: s.name,
                    maxSampleLengthS: s.maxSampleLength,
                    frequencies: s.frequencies
                }
            })
        }
    };
};

export const sampleRequestReceived = {
    sample: true
};

export const sampleRequestFailed = (error: string) => {
    return {
        sample: false,
        error
    };
};

export const sampleStarted = {
    sampleStarted: true
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
