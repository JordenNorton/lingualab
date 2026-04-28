import { createClient } from "@/lib/supabase/server";

export async function getAuthenticatedSupabase(errorMessage = "Log in or create an account to generate new text.") {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { response: Response.json({ error: errorMessage }, { status: 401 }) };
  }

  return { supabase, user };
}

export async function requireSignedInUser(errorMessage?: string) {
  const auth = await getAuthenticatedSupabase(errorMessage);
  if ("response" in auth) return auth.response;

  return null;
}
