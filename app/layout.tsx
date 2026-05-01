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

  return (
    <html lang="en" className={profileClassName}>
      <body className={profileClassName}>{children}</body>
    </html>
  );
}
