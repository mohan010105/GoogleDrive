// Supabase configuration - FRONTEND ONLY
// These must be provided via VITE_* environment variables.
export const SUPABASE_URL = process.env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const STORAGE_BUCKET = 'cloud-drive';

export const ADMIN_EMAIL = 'mohanrajit05@gmail.com'; // Hardcoded for demo logic if DB not connected
export const ADMIN_PASSWORD = 'Mohan@05'; // Hardcoded for demo logic if DB not connected
