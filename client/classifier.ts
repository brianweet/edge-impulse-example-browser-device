import { Emitter } from "./typed-event-emitter";

declare var zip: any;

export class ClassificationLoader extends Emitter<{
    status: [string]
}> {
    private _studioHost: string;
    private _apiKey: string;

    constructor(studioHostUrl: string, apiKey: string) {
        super();

        this._studioHost = studioHostUrl + '/v1/api';
        this._apiKey = apiKey;
    }

    async load() {
        this.emit('status', 'Retrieving projects...');

        let project = await this.getProject();
        if (!project) {
            throw new Error('Could not find any projects');
        }

        const projectId = project.id;

        this.emit('status', 'Downloading deployment...');

        let blob = await this.downloadDeployment(projectId);
        console.log('blob', blob);

        this.emit('status', 'Received blob (' + blob.size + ' bytes)');

        let data = await this.unzip(blob);

        this.emit('status', 'Extracted ' + data.length + ' files');

        let wasmFile = data.find(d => d.filename.indexOf('.wasm'));
        if (!wasmFile) {
            return this.emit('status', 'Cannot find .wasm file in ZIP file');
        }

        let jsFile = data.find(d => d.filename.endsWith('.js'));
        if (!jsFile) {
            return this.emit('status', 'Cannot find .js file in ZIP file');
        }

        let wasmUrl = await this.blobToDataUrl(wasmFile.blob);
        this.emit('status', 'WASM URL is ' + wasmUrl.substr(0, 100) + '...');

        let loaderText = await this.blobToText(jsFile.blob);
        loaderText = 'window.WasmLoader = function (wasmBinaryFile) {\n' +
            loaderText + '\n' +
            'return Module;\n' +
            '}';
        loaderText = loaderText.replace('var wasmBinaryFile="edge-impulse-standalone.wasm"', '');

        console.log('loaderText', loaderText);

        let script = document.createElement('script');
        script.innerHTML = loaderText;
        window.document.body.append(script);

        let module = (<any>window).WasmLoader(wasmUrl);
        this.emit('status', 'Loaded WASM module');

        let classifier = new EdgeImpulseClassifier(module);
        await classifier.init();

        this.emit('status', 'Initialized classifier');

        return classifier;
    }

    private async downloadDeployment(projectId: number): Promise<Blob> {
        return new Promise((resolve, reject) => {
            let x = new XMLHttpRequest();
            x.open('GET', `${this._studioHost}/${projectId}/deployment/download?type=wasm`);
            x.onload = () => {
                if (x.status !== 200) {
                    let reader = new FileReader();
                    reader.onload = () => {
                        reject('No deployment yet: ' + x.status + ' - ' + reader.result);
                    };
                    reader.readAsText(x.response);
                } else {
                    resolve(x.response);
                }
            };
            x.onerror = err => reject(err);
            x.responseType = 'blob';
            x.setRequestHeader('x-api-key', this._apiKey);
            x.send();
        });
    }

    private async getProject(): Promise<{ id: number }> {
        return new Promise((resolve, reject) => {
            let x = new XMLHttpRequest();
            x.open('GET', `${this._studioHost}/projects`);
            x.onload = () => {
                if (x.status !== 200) {
                    reject('No projects found: ' + x.status + ' - ' + JSON.stringify(x.response));
                } else {
                    if (!x.response.success) {
                        reject(x.response.error);
                    }
                    else {
                        resolve(x.response.projects[0]);
                    }
                }
            };
            x.onerror = err => reject(err);
            x.responseType = 'json';
            x.setRequestHeader('x-api-key', this._apiKey);
            x.send();
        });
    }

    private async unzip(blob: Blob): Promise<{ filename: string, blob: Blob }[]> {
        let ret: { filename: string, blob: Blob }[] = [];

        return new Promise((resolve, reject) => {
            zip.createReader(new zip.BlobReader(blob), (reader: any) => {
                reader.getEntries((entries: any) => {
                    for (let e of entries) {
                        e.getData(new zip.BlobWriter(), (file: Blob) => {
                            ret.push({
                                filename: e.filename,
                                blob: file
                            });

                            if (ret.length === entries.length) {
                                return resolve(ret);
                            }
                        });
                    }
                });
            }, (error: Error) => {
                reject(error);
            });
        });
    }

    private async blobToDataUrl(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            let a = new FileReader();
            a.onload = e => resolve(((e.target && e.target.result) || '').toString());
            a.onerror = err => reject(err);
            a.readAsDataURL(blob);
        });
    }

    private async blobToText(blob: Blob): Promise<string> {
        return new Promise(resolve => {
            const reader = new FileReader();

            reader.addEventListener('loadend', (e) => {
                const text = reader.result;
                resolve((text || '').toString());
            });

            reader.readAsText(blob, 'ascii');
        });
    }
}

interface WasmRuntimeModule {
    HEAPU8: {
        buffer: Uint8Array;
    };
    onRuntimeInitialized: () => void;
    run_classifier(dataPointer: number, dataLength: number, debug: boolean): {
        result: number;
        anomaly: number;
        classification: {
            size(): number;
            get(index: number): { label: string, value: number };
        }
    };
    _free(pointer: Uint8Array): void;
    _malloc(bytes: number): number;
}

export class EdgeImpulseClassifier {
    private _initialized = false;
    private _module: WasmRuntimeModule;

    constructor(module: WasmRuntimeModule) {
        this._module = module;
        this._module.onRuntimeInitialized = () => {
            this._initialized = true;
        };
    }

    init() {
        if (this._initialized === true) return Promise.resolve();

        return new Promise((resolve) => {
            this._module.onRuntimeInitialized = () => {
                resolve();
                this._initialized = true;
            };
        });
    }

    classify(rawData: number[], debug = false) {
        if (!this._initialized) throw new Error('Module is not initialized');

        const obj = this._arrayToHeap(rawData);

        let ret = this._module.run_classifier(obj.byteOffset, rawData.length, debug);

        this._module._free(obj);

        if (ret.result !== 0) {
            throw new Error('Classification failed (err code: ' + ret.result + ')');
        }

        let jsResult: { anomaly: number, results: { label: string, value: number }[] } = {
            anomaly: ret.anomaly,
            results: []
        };

        for (let cx = 0; cx < ret.classification.size(); cx++) {
            let c = ret.classification.get(cx);
            jsResult.results.push({ label: c.label, value: c.value });
        }

        return jsResult;
    }

    private _arrayToHeap(data: number[]) {
        let typedArray = new Float32Array(data);
        let numBytes = typedArray.length * typedArray.BYTES_PER_ELEMENT;
        let ptr = this._module._malloc(numBytes);
        let heapBytes = new Uint8Array(this._module.HEAPU8.buffer, ptr, numBytes);
        heapBytes.set(new Uint8Array(typedArray.buffer));
        return heapBytes;
    }
}
