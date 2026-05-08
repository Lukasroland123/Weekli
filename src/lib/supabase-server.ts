import { createClient } from "@supabase/supabase-js";

// Server-side klient med service_role — bruges kun i API routes
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
