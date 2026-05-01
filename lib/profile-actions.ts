"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { profileSettingsSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithMessage(message: string): never {
  redirect(`/dashboard/settings?message=${encodeURIComponent(message)}`);
}

export async function saveProfileSettings(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?message=Log in to update your settings.");
  }

  const parsed = profileSettingsSchema.safeParse({
    displayName: getFormString(formData, "displayName"),
    profilePictureUrl: getFormString(formData, "profilePictureUrl"),
    shortBio: getFormString(formData, "shortBio"),
    learningGoal: getFormString(formData, "learningGoal"),
    targetLanguage: getFormString(formData, "targetLanguage"),
    nativeLanguage: getFormString(formData, "nativeLanguage"),
    currentLevel: getFormString(formData, "currentLevel"),
    regionVariant: getFormString(formData, "regionVariant"),
    fontSize: getFormString(formData, "fontSize"),
    highContrast: formData.get("highContrast") === "on",
    dyslexiaAssist: formData.get("dyslexiaAssist") === "on",
    themePreference: getFormString(formData, "themePreference")
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    redirectWithMessage(issue?.message || "Check your profile settings and try again.");
  }

  const profile = parsed.data;
  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      display_name: profile.displayName,
      profile_picture_url: profile.profilePictureUrl,
      short_bio: profile.shortBio,
      learning_goal: profile.learningGoal,
      target_language: profile.targetLanguage,
      native_language: profile.nativeLanguage,
      current_level: profile.currentLevel,
      region_variant: profile.regionVariant,
      font_size: profile.fontSize,
      high_contrast: profile.highContrast,
      dyslexia_assist: profile.dyslexiaAssist,
      theme_preference: profile.themePreference,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "user_id"
    }
  );

  if (error) {
    redirectWithMessage(error.message);
  }

  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  redirectWithMessage("Settings saved.");
}
