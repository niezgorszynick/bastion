import { supabaseBrowser } from "@/lib/supabase/client";

export async function getUserClient() {
  const supabase = supabaseBrowser();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
