import { clsx } from "clsx";
import type { createClient } from "@/lib/supabase/server";
import { languagePreferenceSchema, profileSettingsSchema, type UserProfile } from "@/lib/schemas";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export const profileSelect =
  "display_name, profile_picture_url, short_bio, learning_goal, target_language, native_language, current_level, region_variant, font_size, high_contrast, dyslexia_assist, theme_preference, updated_at";

export type ProfileRow = {
  display_name: string | null;
  profile_picture_url: string | null;
  short_bio: string | null;
  learning_goal: string | null;
  target_language: string | null;
  native_language: string | null;
  current_level: string | null;
  region_variant: string | null;
  font_size: string | null;
  high_contrast: boolean | null;
  dyslexia_assist: boolean | null;
  theme_preference: string | null;
  updated_at: string | null;
};

export function defaultProfile(): UserProfile {
  return {
    displayName: "",
    profilePictureUrl: "",
    shortBio: "",
    learningGoal: "",
    targetLanguage: "Spanish",
    nativeLanguage: "English",
    currentLevel: "A2",
    regionVariant: "Latin American Spanish",
    fontSize: "default",
    highContrast: false,
    dyslexiaAssist: false,
    themePreference: "system"
  };
}

export function serializeProfile(row?: ProfileRow | null): UserProfile {
  if (!row) return defaultProfile();

  const parsed = profileSettingsSchema.safeParse({
    displayName: row.display_name ?? "",
    profilePictureUrl: row.profile_picture_url ?? "",
    shortBio: row.short_bio ?? "",
    learningGoal: row.learning_goal ?? "",
    targetLanguage: row.target_language ?? "Spanish",
    nativeLanguage: row.native_language ?? "English",
    currentLevel: row.current_level ?? "A2",
    regionVariant: row.region_variant ?? "",
    fontSize: row.font_size ?? "default",
    highContrast: row.high_contrast ?? false,
    dyslexiaAssist: row.dyslexia_assist ?? false,
    themePreference: row.theme_preference ?? "system"
  });

  return {
    ...(parsed.success ? parsed.data : defaultProfile()),
    updatedAt: row.updated_at ?? undefined
  };
}

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value.trim() : "";
}

export function languagePreferencesFromMetadata(metadata: Record<string, unknown> | null | undefined) {
  const fallback = defaultProfile();
  const parsed = languagePreferenceSchema.safeParse({
    targetLanguage: getMetadataString(metadata ?? {}, "target_language") || fallback.targetLanguage,
    nativeLanguage: getMetadataString(metadata ?? {}, "native_language") || fallback.nativeLanguage,
    currentLevel: getMetadataString(metadata ?? {}, "current_level") || fallback.currentLevel,
    regionVariant: getMetadataString(metadata ?? {}, "region_variant") || fallback.regionVariant
  });

  return parsed.success
    ? parsed.data
    : {
        targetLanguage: fallback.targetLanguage,
        nativeLanguage: fallback.nativeLanguage,
        currentLevel: fallback.currentLevel,
        regionVariant: fallback.regionVariant
      };
}

export function languagePreferencesToMetadata(preferences: ReturnType<typeof languagePreferencesFromMetadata>) {
  return {
    target_language: preferences.targetLanguage,
    native_language: preferences.nativeLanguage,
    current_level: preferences.currentLevel,
    region_variant: preferences.regionVariant
  };
}

export async function ensureProfileFromUserMetadata(supabase: ServerSupabaseClient) {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle<{ user_id: string }>();

  if (existing || existingError) return;

  const fallback = defaultProfile();
  const preferences = languagePreferencesFromMetadata(user.user_metadata);

  await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      display_name: "",
      profile_picture_url: "",
      short_bio: "",
      learning_goal: "",
      target_language: preferences.targetLanguage,
      native_language: preferences.nativeLanguage,
      current_level: preferences.currentLevel,
      region_variant: preferences.regionVariant,
      font_size: fallback.fontSize,
      high_contrast: fallback.highContrast,
      dyslexia_assist: fallback.dyslexiaAssist,
      theme_preference: fallback.themePreference,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "user_id"
    }
  );
}

export function getProfileDisplayName(profile: UserProfile, email?: string | null) {
  return profile.displayName || email?.split("@")[0] || "learner";
}

export function getProfileInitials(profile: UserProfile, email?: string | null) {
  const name = getProfileDisplayName(profile, email);
  const parts = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2);

  return (parts.join("") || "LL").toUpperCase();
}

export function getProfileClassName(profile: UserProfile, baseClassName = "") {
  return clsx(
    baseClassName,
    `profile-font-${profile.fontSize}`,
    profile.highContrast && "profile-high-contrast",
    profile.dyslexiaAssist && "profile-dyslexia",
    profile.themePreference === "light" && "profile-theme-light",
    profile.themePreference === "dark" && "profile-theme-dark"
  );
}
