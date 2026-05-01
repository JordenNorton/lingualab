import { clsx } from "clsx";
import { profileSettingsSchema, type UserProfile } from "@/lib/schemas";

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
