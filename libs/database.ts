import { supabase } from './supabaseClient';

export class DatabaseHandler {
    static async saveWorld(world: JSON, worldId: string) {
        // Try to find existing world
        const { data: existing } = await supabase
            .from('worlds')
            .select('id')
            .eq('worldId', worldId)
            .single();

        if (existing) {
            // Update existing world
            const { data, error } = await supabase
                .from('worlds')
                .update({ world: world })
                .eq('id', existing.id)
                .select();
            if (error) console.error(error);
            return data;
        } else {
            // Insert new world
            const { data, error } = await supabase
                .from('worlds')
                .insert([{ worldId: worldId, world: world }])
                .select();
            if (error) console.error(error);
            return data;
        }
    }

    static async loadWorld(worldId: string) {
        const { data, error } = await supabase
            .from('worlds')
            .select('*')
            .eq('worldId', worldId)
            .single();
        
        if (error) {
            console.error(error);
            return null;
        }

        console.log(data);
        return data?.world;
    }
}