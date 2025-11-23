export interface SplashTextEntry {
    text: string;
    fontSize: number;
}

export interface WorldMetadata {
    worldId: string;
    seed: number;
    world: JSON;
    settings: Settings;
}

export interface Settings {
    fov: number;
    renderDistance: number;
}