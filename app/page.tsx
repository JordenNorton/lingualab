import { LanguageLab } from "@/components/language-lab";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return <LanguageLab userEmail={user?.email ?? null} />;
}
