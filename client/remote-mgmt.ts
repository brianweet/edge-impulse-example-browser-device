import {
    sampleRequestReceived, sampleFinished, sampleUploading, dataMessage,
    helloMessage, sampleRequestFailed, sampleStarted
} from "./messages";
import { parseMessage, createSignature, takeSample } from "./utils";
import { EdgeImpulseSettings, SampleDetails } from "./models";
import { getRemoteManagementEndpoint, getIngestionApi } from "./settings";
import { AxiosStatic } from '../node_modules/axios';
import { Emitter } from "./typed-event-emitter";

declare var axios: AxiosStatic;

interface RemoteManagementConnectionState {
    socketConnected: boolean;
    remoteManagementConnected: boolean;
    error: string | null;
    sample: SampleDetails | null;
    isSampling: boolean;
}

export class RemoteManagementConnection extends Emitter<{
    connected: [],
    error: [string],
    samplingStarted: [number],
    samplingReceived: [number, string],
    samplingUploading: [],
    samplingFinished: [],
    samplingError: [string]
}> {
    private _socket: WebSocket;
    private _socketHeartbeat = -1;
    private _state: RemoteManagementConnectionState;
    private _settings: EdgeImpulseSettings;

    constructor(settings: EdgeImpulseSettings) {
        super();

        this._socket = new WebSocket(getRemoteManagementEndpoint());
        this._state = {
            socketConnected: false,
            remoteManagementConnected: false,
            error: null,
            sample: null,
            isSampling: false
        };
        this._settings = settings;

        this._socket.onopen = _e => {
            this._state.socketConnected = true;
            this.sendMessage(helloMessage(this._settings));
            this._socketHeartbeat = window.setInterval(() => {
                this._socket.send("ping");
            }, 3000);
        };

        this._socket.onmessage = async event => {
            const data = await parseMessage(event);
            if (!data) {
                return;
            }

            // ping messages are not understood, so skip those
            if (data.err !== undefined && data.err.indexOf('Failed to parse') === -1) {
                this.emit('error', data.err);
            }

            if (data.hello !== undefined) {
                const msg = data.hello;
                this._state.remoteManagementConnected = msg.hello;
                this._state.error = msg.error;
                if (this._state.error) {
                    this.emit('error', this._state.error);
                }
                else {
                    this.emit('connected');
                }
            }

            if (data.sample !== undefined) {
                const msg = data.sample as SampleDetails;
                if (!msg || !msg.hmacKey) {
                    this.sendMessage(sampleRequestFailed("Message or hmacKey empty"));
                    return;
                }

                try {

                    this.emit('samplingReceived', msg.length, msg.sensor);

                    this.sendMessage(sampleRequestReceived);

                    await this.sleep(2000);

                    // Start to sample
                    this._state.sample = msg;
                    this._state.isSampling = true;
                    this.sendMessage(sampleStarted);
                    const sampleDetails = {
                        ...msg
                    };

                    this.emit('samplingStarted', msg.length);

                    const sampleData = await takeSample({
                        length: msg.length
                    });

                    // Upload sample
                    if (sampleData.measurements.length <= 0) {
                        this.sendMessage(
                            sampleRequestFailed("Was not able to capture any measurements from this device. " +
                                "This is probably a permission issue on the mobile client.")
                        );
                        this.emit('samplingFinished');
                        this.emit('samplingError', 'Could not capture any sensor data, this is likely a permissions issue');
                    } else {
                        await this.uploadSample(
                            sampleDetails,
                            dataMessage(this._settings, sampleData.measurements)
                        );
                        this._state.sample = msg;
                        this._state.isSampling = false;
                    }
                }
                catch (ex) {
                    this.emit('samplingFinished');
                    this.emit('samplingError', ex.message || ex.toString());
                    this.sendMessage(
                        sampleRequestFailed("Failed to sample: " +
                            ex.message || ex.toString())
                    );
                }
            }
        };

        this._socket.onclose = event => {
            clearInterval(this._socketHeartbeat);
            const msg = event.wasClean ?
                `[close] Connection closed cleanly, code=${event.code} reason=${event.reason}` : // e.g. server process killed or network down
                // event.code is usually 1006 in this case
                "[close] Connection died";
            this._state.socketConnected = false;
            this._state.remoteManagementConnected = false;
            this._state.error = msg;
            this.emit('error', this._state.error);
        };

        this._socket.onerror = error => {
            this._state.socketConnected = false;
            this._state.remoteManagementConnected = false;
            this._state.error = (error as unknown) as string;
            this.emit('error', this._state.error);
        };
    }

    sendMessage = (data: any) => {
        this._socket.send(JSON.stringify(data));
    };

    private async uploadSample(
        details: SampleDetails,
        data: ReturnType < typeof dataMessage >
    ) {
        try {
            this.emit('samplingUploading');

            // Sign it please
            data.signature = await createSignature(details.hmacKey, data);
            this.sendMessage(sampleUploading);
            await axios({
                url: getIngestionApi() + details.path,
                method: "POST",
                headers: {
                    "x-api-key": this._settings.apiKey,
                    "x-file-name": details.label,
                    "Content-Type": "application/json"
                },
                data: data
            });
            this.sendMessage(sampleFinished);

            this.emit('samplingFinished');
        } catch (e) {
            alert(JSON.stringify(e));
        }
    }

    private sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
