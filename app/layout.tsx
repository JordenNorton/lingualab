import type { Metadata } from "next";
import { defaultProfile, getProfileClassName, profileSelect, serializeProfile, type ProfileRow } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinguaLab",
  description: "AI-generated reading practice, explanations, and workbook drills for language learners."
};

async function getLayoutProfile() {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return defaultProfile();

    const { data } = await supabase
      .from("profiles")
      .select(profileSelect)
      .eq("user_id", user.id)
      .maybeSingle<ProfileRow>();

    return serializeProfile(data);
  } catch {
    return defaultProfile();
  }
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getLayoutProfile();
  const profileClassName = getProfileClassName(profile);
  const year = new Date().getFullYear();

  return (
    <html lang="en" className={profileClassName}>
      <body className={profileClassName}>
        {children}
        <footer className="mx-auto w-full max-w-[1500px] px-4 pb-6 pt-2 text-center text-xs text-ink/45 sm:px-6 lg:px-8">
          <div className="border-t border-ink/10 pt-4">
            Copyright &copy; {year} Jorden Norton
          </div>
        </footer>
      </body>
    </html>
  );
}
