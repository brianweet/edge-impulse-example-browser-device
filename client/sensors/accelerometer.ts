import { ISensor } from "./isensor";

export class AccelerometerSensor implements ISensor {
    private _permissionGranted = false;

    constructor() {
        /* noop */
    }

    hasSensor() {
        return typeof DeviceMotionEvent !== 'undefined';
    }

    checkPermissions(): Promise<boolean> {
        if (!this.hasSensor()) {
            throw new Error('Accelerometer not present on this device');
        }

        if (typeof (DeviceMotionEvent as any).requestPermission !== 'function') {
            return Promise.resolve(true);
        }

        if (this._permissionGranted) {
            return Promise.resolve(true);
        }

        return (DeviceMotionEvent as any).requestPermission().then((response: string) => {
            return response === 'granted';
        }).catch((err: Error | string) => {
            let msg = typeof err === 'string' ? err : (err.message || err.toString());
            if (msg.indexOf('requires a user gesture to prompt') > -1) {
                return Promise.resolve(false);
            }
            else {
                throw err;
            }
        });
    }

    getProperties() {
        return {
            name: 'Accelerometer',
            maxSampleLength: 5 * 60,
            frequencies: [ 62.5 ]
        };
    }
}
