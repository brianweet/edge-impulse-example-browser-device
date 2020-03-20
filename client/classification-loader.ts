import { Emitter } from "./typed-event-emitter";
import { EdgeImpulseClassifier, zip } from "./classifier";
export class ClassificationLoader extends Emitter<{
    status: [string];
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
        const project = await this.getProject();
        if (!project) {
            throw new Error('Could not find any projects');
        }
        const projectId = project.id;
        this.emit('status', 'Downloading deployment...');
        const blob = await this.downloadDeployment(projectId);
        // tslint:disable-next-line:no-console
        console.log('blob', blob);
        this.emit('status', 'Received blob (' + blob.size + ' bytes)');
        const data = await this.unzip(blob);
        this.emit('status', 'Extracted ' + data.length + ' files');
        const wasmFile = data.find(d => d.filename.indexOf('.wasm'));
        if (!wasmFile) {
            return this.emit('status', 'Cannot find .wasm file in ZIP file');
        }
        const jsFile = data.find(d => d.filename.endsWith('.js'));
        if (!jsFile) {
            return this.emit('status', 'Cannot find .js file in ZIP file');
        }
        const wasmUrl = await this.blobToDataUrl(wasmFile.blob);
        this.emit('status', 'WASM URL is ' + wasmUrl.substr(0, 100) + '...');
        let loaderText = await this.blobToText(jsFile.blob);
        loaderText = 'window.WasmLoader = function (wasmBinaryFile) {\n' +
            loaderText + '\n' +
            'return Module;\n' +
            '}';
        loaderText = loaderText.replace('var wasmBinaryFile="edge-impulse-standalone.wasm"', '');
        // tslint:disable-next-line:no-console
        console.log('loaderText', loaderText);
        const script = document.createElement('script');
        script.innerHTML = loaderText;
        window.document.body.append(script);
        const module = (window as any).WasmLoader(wasmUrl);
        this.emit('status', 'Loaded WASM module');
        const classifier = new EdgeImpulseClassifier(module);
        await classifier.init();
        this.emit('status', 'Initialized classifier');
        return classifier;
    }
    private async downloadDeployment(projectId: number): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const x = new XMLHttpRequest();
            x.open('GET', `${this._studioHost}/${projectId}/deployment/download?type=wasm`);
            x.onload = () => {
                if (x.status !== 200) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        reject('No deployment yet: ' + x.status + ' - ' + reader.result);
                    };
                    reader.readAsText(x.response);
                }
                else {
                    resolve(x.response);
                }
            };
            x.onerror = err => reject(err);
            x.responseType = 'blob';
            x.setRequestHeader('x-api-key', this._apiKey);
            x.send();
        });
    }
    private async getProject(): Promise<{
        id: number;
    }> {
        return new Promise((resolve, reject) => {
            const x = new XMLHttpRequest();
            x.open('GET', `${this._studioHost}/projects`);
            x.onload = () => {
                if (x.status !== 200) {
                    reject('No projects found: ' + x.status + ' - ' + JSON.stringify(x.response));
                }
                else {
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
    private async unzip(blob: Blob): Promise<{
        filename: string;
        blob: Blob;
    }[]> {
        const ret: {
            filename: string;
            blob: Blob;
        }[] = [];
        return new Promise((resolve, reject) => {
            zip.createReader(new zip.BlobReader(blob), (reader: any) => {
                reader.getEntries((entries: any) => {
                    for (const e of entries) {
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
            const a = new FileReader();
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
