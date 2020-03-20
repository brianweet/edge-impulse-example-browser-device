import {
    Measurements,
    Sample
} from "./models";

declare var CBOR: { encode(obj: { }): string; decode(a: string | ArrayBuffer): { } };

export const readFile = (file: Blob) => {
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) {
                resolve(CBOR.decode(reader.result));
            }
            reject("Only support ArrayBuffer");
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

export const parseMessage = async (event: MessageEvent) => {
    if (event.data instanceof Blob) {
        return await readFile(event.data);
    } else if (typeof event.data === "string") {
        return JSON.parse(event.data);
    }
    return null;
};

export const takeSample = (data: {
    length: number
}) => {
    return new Promise < Sample > ((resolve, _reject) => {
        const sampleValues: Measurements = [];
        const intervalValues: number[] = [];

        const newSensorEvent = (event: DeviceMotionEvent) => {
            if (event.accelerationIncludingGravity) {
                const value = [
                    event.accelerationIncludingGravity.x || 0,
                    event.accelerationIncludingGravity.y || 0,
                    event.accelerationIncludingGravity.z || 0
                ];
                sampleValues.push(value);
                intervalValues.push(event.interval);
            }
        };

        window.addEventListener("devicemotion", newSensorEvent);

        window.setTimeout(() => {
            window.removeEventListener("devicemotion", newSensorEvent);
            resolve({
                measurements: sampleValues,
                intervalValues
            });
        }, data.length);
    });
};

export const createSignature = async (
    hmacKey: string,
    data: {
        signature: string
    }
) => {
    // encoder to convert string to Uint8Array
    let enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw', // raw format of the key - should be Uint8Array
        enc.encode(hmacKey), {
            // algorithm details
            name: 'HMAC',
            hash: {
                name: 'SHA-256'
            }
        },
        false, // export = false
        ['sign', 'verify'] // what this key can do
    );
    // Create signature for encoded input data
    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        enc.encode(JSON.stringify(data))
    );
    // Convert back to Hex
    let b = new Uint8Array(signature);
    return Array.prototype.map
        .call(b, x => ('00' + x.toString(16)).slice(-2))
        .join('');
};
