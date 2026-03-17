import fs from 'fs';
import postgres from 'postgres';

const dbUrl = 'postgresql://postgres:5718684v7J%40@db.chqaavzvgztuiqepzywt.supabase.co:5432/postgres';
const sqlPath = './supabase.sql';

async function main() {
  const sql = postgres(dbUrl, { ssl: 'require' });
  const script = fs.readFileSync(sqlPath, 'utf8');
  
  try {
    console.log('Running SQL...');
    await sql.unsafe(script);
    console.log('Successfully created tables and policies on Supabase.');
  } catch (error) {
    console.error('Error running SQL:', error);
  } finally {
    await sql.end();
  }
}

main();
