import { createClient } from "@supabase/supabase-js";

const isDev = import.meta.env.DEV;
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

if (isDev && typeof window !== 'undefined') {
  // In development (including Trae Preview), use local proxy to avoid network/CORS issues
  supabaseUrl = `${window.location.origin}/supabase-api`;
}

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables");
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
