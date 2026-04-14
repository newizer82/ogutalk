import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ .env.local에 Supabase 설정이 없습니다!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)