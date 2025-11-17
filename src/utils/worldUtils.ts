export class WorldUtils {
    static randomWorldId(): string {
        return Math.random().toString(36).substring(2, 21);
    }

    static randomSeed(): number {
        return Math.floor(Math.random() * 100000000000);
    }
}