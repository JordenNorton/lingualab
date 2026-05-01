"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ensureProfileFromUserMetadata, languagePreferencesToMetadata } from "@/lib/profile";
import { languagePreferenceSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithMessage(path: string, message: string): never {
  redirect(`${path}?message=${encodeURIComponent(message)}`);
}

export async function login(formData: FormData) {
  const email = getFormString(formData, "email");
  const password = getFormString(formData, "password");

  if (!email || !password) {
    redirectWithMessage("/login", "Enter your email and password.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirectWithMessage("/login", error.message);
  }

  await ensureProfileFromUserMetadata(supabase);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const email = getFormString(formData, "email");
  const password = getFormString(formData, "password");
  const origin = (await headers()).get("origin");

  if (!email || !password) {
    redirectWithMessage("/signup", "Enter your email and password.");
  }

  if (password.length < 6) {
    redirectWithMessage("/signup", "Use a password with at least 6 characters.");
  }

  const preferences = languagePreferenceSchema.safeParse({
    targetLanguage: getFormString(formData, "targetLanguage"),
    nativeLanguage: getFormString(formData, "nativeLanguage"),
    currentLevel: getFormString(formData, "currentLevel"),
    regionVariant: getFormString(formData, "regionVariant")
  });

  if (!preferences.success) {
    redirectWithMessage("/signup", "Choose your language preferences before creating an account.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      data: languagePreferencesToMetadata(preferences.data)
    }
  });

  if (error) {
    redirectWithMessage("/signup", error.message);
  }

  revalidatePath("/", "layout");
  redirectWithMessage("/login", "Check your email to confirm your account, then log in.");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
