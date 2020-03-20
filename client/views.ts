import { getApiKey, getHmacKey, getDeviceId, storeApiKey, storeHmacKey, storeDeviceId } from "./settings";
import { RemoteManagementConnection } from "./remote-mgmt";

export class ClientViews {
    private _views: { [k: string]: HTMLElement } = {
        loading: <HTMLElement>document.querySelector('#loading-view'),
        qrcode: <HTMLElement>document.querySelector('#qrcode-view'),
        connecting: <HTMLElement>document.querySelector('#remote-mgmt-connecting'),
        connected: <HTMLElement>document.querySelector('#remote-mgmt-connected'),
        connectionFailed: <HTMLElement>document.querySelector('#remote-mgmt-failed'),
        sampling: <HTMLElement>document.querySelector('#sampling-in-progress')
    };

    private _elements = {
        deviceId: <HTMLElement>document.querySelector('#connected-device-id'),
        connectionFailedMessage: <HTMLElement>document.querySelector('#connection-failed-message'),
        samplingTimeLeft: <HTMLElement>document.querySelector('#sampling-time-left'),
        samplingRecordingStatus: <HTMLElement>document.querySelector('#sampling-recording-data-message'),
        samplingRecordingSensor: <HTMLElement>document.querySelector('#sampling-recording-sensor')
    };

    constructor() {
        storeDeviceId(getDeviceId());

        if (getApiKey()) {
            this.switchView(this._views.connecting);

            let connection = new RemoteManagementConnection({
                apiKey: getApiKey(),
                device: {
                    deviceId: getDeviceId(),
                    accelerometerInterval: 62.5,
                    deviceType: 'MOBILE_CLIENT'
                }
            });
            connection.on('connected', () => {
                // persist keys now...
                storeApiKey(getApiKey());

                this._elements.deviceId.textContent = getDeviceId();
                this.switchView(this._views.connected);
            });
            connection.on('error', err => {
                this._elements.connectionFailedMessage.textContent = err;
                this.switchView(this._views.connectionFailed);
            });

            let samplingInterval: number | undefined;

            connection.on('samplingReceived', (length, sensor) => {
                clearInterval(samplingInterval);

                this.switchView(this._views.sampling);
                this._elements.samplingRecordingStatus.textContent = 'Received sample request';
                this._elements.samplingTimeLeft.textContent = 'Waiting...';
                this._elements.samplingRecordingSensor.textContent = sensor;
            });
            connection.on('samplingStarted', length => {
                let remaining = length;

                this._elements.samplingRecordingStatus.textContent = 'Recording data';
                this._elements.samplingTimeLeft.textContent = Math.floor(remaining / 1000) + 's';

                samplingInterval = setInterval(() => {
                    remaining -= 1000;
                    if (remaining < 0) {
                        return clearInterval(samplingInterval);
                    }

                    this._elements.samplingTimeLeft.textContent = Math.floor(remaining / 1000) + 's';
                }, 1000);
            });
            connection.on('samplingUploading', () => {
                clearInterval(samplingInterval);
            });
            connection.on('samplingFinished', () => {
                this.switchView(this._views.connected);
            });
            connection.on('samplingError', error => {
                alert(error);
            });
        }
        else {
            this.switchView(this._views.qrcode);
        }
    }

    private switchView(view: HTMLElement) {
        for (let k of Object.keys(this._views)) {
            this._views[k].style.display = 'none';
        }
        view.style.display = '';
    }
}