
export declare var zip: any;

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

        const ret = this._module.run_classifier(obj.byteOffset, rawData.length, debug);

        this._module._free(obj);

        if (ret.result !== 0) {
            throw new Error('Classification failed (err code: ' + ret.result + ')');
        }

        const jsResult: { anomaly: number, results: { label: string, value: number }[] } = {
            anomaly: ret.anomaly,
            results: []
        };

        for (let cx = 0; cx < ret.classification.size(); cx++) {
            const c = ret.classification.get(cx);
            jsResult.results.push({ label: c.label, value: c.value });
        }

        return jsResult;
    }

    private _arrayToHeap(data: number[]) {
        const typedArray = new Float32Array(data);
        const numBytes = typedArray.length * typedArray.BYTES_PER_ELEMENT;
        const ptr = this._module._malloc(numBytes);
        const heapBytes = new Uint8Array(this._module.HEAPU8.buffer, ptr, numBytes);
        heapBytes.set(new Uint8Array(typedArray.buffer));
        return heapBytes;
    }
}
