import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  DB_PATH: process.env.DB_PATH || path.join(DATA_DIR, 'concurso.db'),
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173'
};
