## Supabase Configuration
- **URL**: Accessed via `process.env.SUPABASE_URL`
- **Auth**: Use `process.env.SUPABASE_ANON_KEY` 
- **Client Setup** (example):
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_ANON_KEY
)

// @supabase-context.md
export default function handler(req, res) {
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  });
}

