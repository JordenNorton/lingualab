import { createClient } from "@/lib/supabase/server";

export async function requireSignedInUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return Response.json({ error: "Log in or create an account to generate new text." }, { status: 401 });
  }

  return null;
}
