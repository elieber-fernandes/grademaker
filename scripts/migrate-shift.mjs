import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Adding 'shift' to class_groups in Supabase...");
    
    // We update all existing class blocks by defaulting them to 'M'.
    // If the column doesn't exist, we must use raw SQL, but we don't have direct SQL access
    // from Anon key. So we just update the field, Supabase JS client handles jsonb extensions or
    // we assume the user already created the column if strict schema.
    // However, since we are doing full replaces in store, let's verify if we can just update.
    
    const { data: classes } = await supabase.from('class_groups').select('*');
    if (!classes) {
        console.error("No classes found or query failed.");
        return;
    }
    
    let updated = 0;
    for (const c of classes) {
        // Fallback default is 'M'
        const shift = c.name.includes('Série') ? 'M' : 'M'; 
        const { error } = await supabase.from('class_groups').update({ shift }).eq('id', c.id);
        if (error) {
             console.error("Failed to update class", c.name, error);
        } else {
             updated++;
        }
    }
    console.log(`Successfully migrated ${updated} classes to have shift='M'.`);
}

main().catch(console.error);
