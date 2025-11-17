import { WorldMetadata } from "../types/models";
import { LocalStorageHandler } from "./localStorageUtil";

export class WorldStorage {
    static saveWorld(worldId: string, worldData: any, seed: number) {
        const worldEntry = {
            worldId,
            seed: seed,
            world: worldData
        } as WorldMetadata;
        LocalStorageHandler.save(worldId, JSON.stringify(worldEntry));
    }

    static async loadWorld(worldId: string): Promise<WorldMetadata | null> {
        const worldEntryStr = await LocalStorageHandler.get(worldId);
        if (worldEntryStr) {
            const worldEntry = JSON.parse(worldEntryStr) as WorldMetadata;
            return worldEntry;
        }
        return null;
    }

    static removeWorld(worldId: string) {
        LocalStorageHandler.remove(worldId);
    }
}