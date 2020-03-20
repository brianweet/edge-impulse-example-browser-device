import { getApiKey, getDeviceId, storeApiKey, storeDeviceId } from "./settings";
import { RemoteManagementConnection } from "./remote-mgmt";

export class ClientViews {
    private _views: { [k: string]: HTMLElement } = {
        loading: document.querySelector('#loading-view') as HTMLElement,
        qrcode: document.querySelector('#qrcode-view') as HTMLElement,
        connecting: document.querySelector('#remote-mgmt-connecting') as HTMLElement,
        connected: document.querySelector('#remote-mgmt-connected') as HTMLElement,
        connectionFailed: document.querySelector('#remote-mgmt-failed') as HTMLElement,
        sampling: document.querySelector('#sampling-in-progress') as HTMLElement
    };

    private _elements = {
        deviceId: document.querySelector('#connected-device-id') as HTMLElement,
        connectionFailedMessage: document.querySelector('#connection-failed-message') as HTMLElement,
        samplingTimeLeft: document.querySelector('#sampling-time-left') as HTMLElement,
        samplingRecordingStatus: document.querySelector('#sampling-recording-data-message') as HTMLElement,
        samplingRecordingSensor: document.querySelector('#sampling-recording-sensor') as HTMLElement
    };

    constructor() {
        storeDeviceId(getDeviceId());

        if (getApiKey()) {
            this.switchView(this._views.connecting);

            const connection = new RemoteManagementConnection({
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
        for (const k of Object.keys(this._views)) {
            this._views[k].style.display = 'none';
        }
        view.style.display = '';
    }
}