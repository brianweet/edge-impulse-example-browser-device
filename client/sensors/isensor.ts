export interface ISensor {
    getProperties(): {
        name: string,
        maxSampleLength: number,
        frequencies: number[]
    };
    hasSensor(): boolean;
    checkPermissions(): Promise<boolean>;
}
