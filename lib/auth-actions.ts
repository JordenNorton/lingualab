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

async function getOrigin() {
  const origin = (await headers()).get("origin");
  return origin ?? "http://localhost:3000";
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
  const origin = await getOrigin();

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

export async function requestPasswordReset(formData: FormData) {
  const email = getFormString(formData, "email");

  if (!email) {
    redirectWithMessage("/forgot-password", "Enter your email address.");
  }

  const origin = await getOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`
  });

  if (error) {
    console.error("Password reset email could not be sent", error);
    redirectWithMessage("/forgot-password", "We could not send a reset link right now. Please try again.");
  }

  redirectWithMessage("/login", "If an account exists for that email, a password reset link has been sent.");
}

export async function updatePassword(formData: FormData) {
  const password = getFormString(formData, "password");
  const confirmPassword = getFormString(formData, "confirmPassword");

  if (!password || !confirmPassword) {
    redirectWithMessage("/reset-password", "Enter and confirm your new password.");
  }

  if (password.length < 6) {
    redirectWithMessage("/reset-password", "Use a password with at least 6 characters.");
  }

  if (password !== confirmPassword) {
    redirectWithMessage("/reset-password", "The passwords do not match.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password
  });

  if (error) {
    console.error("Password could not be updated", error);
    redirectWithMessage("/reset-password", "Your password could not be updated. Please request a fresh reset link.");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function resendConfirmation(formData: FormData) {
  const email = getFormString(formData, "email");

  if (!email) {
    redirectWithMessage("/resend-confirmation", "Enter your email address.");
  }

  const origin = await getOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`
    }
  });

  if (error) {
    console.error("Confirmation email could not be resent", error);
    redirectWithMessage("/resend-confirmation", "We could not send a confirmation link right now. Please try again.");
  }

  redirectWithMessage("/login", "If that email is waiting for confirmation, a new confirmation link has been sent.");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
