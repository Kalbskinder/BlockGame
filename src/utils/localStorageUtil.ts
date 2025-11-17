export class LocalStorageHandler {
    static async save(key: string, value: string) {
        localStorage.setItem(key, value);
        window.dispatchEvent(new StorageEvent('storage'));
    }

    static async get(key: string): Promise<string | null> {
        return localStorage.getItem(key);
    }

    static async remove(key: string) {
        localStorage.removeItem(key);
        window.dispatchEvent(new StorageEvent('storage'));
    }
}