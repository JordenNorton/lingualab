import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/lib/auth-actions";
import { saveProfileSettings } from "@/lib/profile-actions";
import {
  getProfileDisplayName,
  getProfileInitials,
  profileSelect,
  serializeProfile,
  type ProfileRow
} from "@/lib/profile";
import { fontSizePreferences, languageOptions, levels, themePreferences, type UserProfile } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

type SettingsPageProps = {
  searchParams: Promise<{
    message?: string | string[];
  }>;
};

const fontSizeLabels: Record<(typeof fontSizePreferences)[number], string> = {
  small: "Small",
  default: "Default",
  large: "Large",
  "extra-large": "Extra large"
};

const themeLabels: Record<(typeof themePreferences)[number], string> = {
  system: "System",
  light: "Light",
  dark: "Dark"
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login?message=Log in to update your settings.");
  }

  const { data, error: profileError } = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("user_id", user.id)
    .maybeSingle<ProfileRow>();
  const profile = serializeProfile(data);
  const params = await searchParams;
  const message = firstValue(params.message);
  const displayName = getProfileDisplayName(profile, user.email);

  if (profileError) console.error("Profile settings unavailable", profileError);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-ink/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/dashboard" className="text-sm font-semibold text-lagoon">
            Dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Settings</h1>
          <p className="mt-1 text-sm text-ink/62">Personalize your LinguaLab workspace.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="flex h-10 items-center rounded-md border border-ink/15 px-3 text-sm font-medium text-ink transition hover:border-lagoon/50 hover:text-lagoon"
          >
            Generate lesson
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="flex h-10 items-center rounded-md bg-ink px-3 text-sm font-medium text-white transition hover:bg-graphite"
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      {message ? <p className="rounded-md border border-lagoon/20 bg-lagoon/10 px-4 py-3 text-sm font-semibold text-lagoon">{message}</p> : null}
      {profileError ? (
        <p className="rounded-md border border-coral/20 bg-coral/10 px-4 py-3 text-sm text-ink/70">
          Your settings could not be loaded right now. Some changes may not save until this is resolved.
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
          <Avatar profile={profile} email={user.email} size="large" />
          <h2 className="mt-4 text-2xl font-semibold text-ink">{displayName}</h2>
          <p className="mt-1 text-sm text-ink/55">{user.email}</p>
          <p className="mt-4 text-sm text-ink/68">
            {profile.shortBio || "Add a short bio so your dashboard feels a little more like your own desk."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-md bg-lagoon/10 px-2.5 py-1 text-lagoon">{profile.targetLanguage}</span>
            <span className="rounded-md bg-coral/10 px-2.5 py-1 text-coral">{profile.currentLevel}</span>
            <span className="rounded-md bg-saffron/10 px-2.5 py-1 text-saffron">{fontSizeLabels[profile.fontSize]}</span>
          </div>
        </aside>

        <form action={saveProfileSettings} className="space-y-4">
          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
            <h2 className="text-xl font-semibold text-ink">Profile</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <TextField label="Display name" name="displayName" defaultValue={profile.displayName} maxLength={80} placeholder={displayName} />
              <TextField
                label="Profile picture URL"
                name="profilePictureUrl"
                defaultValue={profile.profilePictureUrl}
                maxLength={500}
                placeholder="https://..."
                type="url"
              />
              <TextareaField label="Short bio" name="shortBio" defaultValue={profile.shortBio} maxLength={280} />
              <TextareaField label="Learning goal" name="learningGoal" defaultValue={profile.learningGoal} maxLength={320} />
            </div>
          </section>

          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
            <h2 className="text-xl font-semibold text-ink">Language Learning</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <LanguageField label="Learning language" name="targetLanguage" defaultValue={profile.targetLanguage} />
              <LanguageField label="Native language" name="nativeLanguage" defaultValue={profile.nativeLanguage} />
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-ink/70">Current level</span>
                <select
                  className="h-11 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
                  name="currentLevel"
                  defaultValue={profile.currentLevel}
                >
                  {levels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
              <TextField label="Regional variant" name="regionVariant" defaultValue={profile.regionVariant} maxLength={80} placeholder="Optional" />
            </div>
          </section>

          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
            <h2 className="text-xl font-semibold text-ink">Reading Comfort</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-ink/70">Font size</span>
                <select
                  className="h-11 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
                  name="fontSize"
                  defaultValue={profile.fontSize}
                >
                  {fontSizePreferences.map((size) => (
                    <option key={size} value={size}>
                      {fontSizeLabels[size]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-ink/70">Theme preference</span>
                <select
                  className="h-11 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
                  name="themePreference"
                  defaultValue={profile.themePreference}
                >
                  {themePreferences.map((theme) => (
                    <option key={theme} value={theme}>
                      {themeLabels[theme]}
                    </option>
                  ))}
                </select>
              </label>
              <CheckboxField
                label="High contrast"
                name="highContrast"
                defaultChecked={profile.highContrast}
                description="Increase contrast across dashboard and settings surfaces."
              />
              <CheckboxField
                label="Dyslexia assist"
                name="dyslexiaAssist"
                defaultChecked={profile.dyslexiaAssist}
                description="Use a simpler reading font and roomier line height."
              />
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="flex h-11 items-center rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-graphite"
            >
              Save settings
            </button>
            <Link
              href="/dashboard"
              className="flex h-11 items-center rounded-md border border-ink/15 px-5 text-sm font-semibold text-ink transition hover:border-lagoon/50 hover:text-lagoon"
            >
              Back to dashboard
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

function Avatar({ profile, email, size = "default" }: { profile: UserProfile; email?: string | null; size?: "default" | "large" }) {
  const className =
    size === "large"
      ? "flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg bg-ink text-3xl font-semibold text-paper"
      : "flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-ink text-xl font-semibold text-paper";

  if (profile.profilePictureUrl) {
    return (
      <div
        aria-hidden="true"
        className={`${className} bg-cover bg-center`}
        style={{ backgroundImage: `url("${profile.profilePictureUrl.replace(/"/g, "%22")}")` }}
      />
    );
  }

  return <div className={className}>{getProfileInitials(profile, email)}</div>;
}

function TextField({
  label,
  name,
  defaultValue,
  maxLength,
  placeholder,
  type = "text"
}: {
  label: string;
  name: string;
  defaultValue: string;
  maxLength: number;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium text-ink/70">{label}</span>
      <input
        className="h-11 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
        defaultValue={defaultValue}
        maxLength={maxLength}
        name={name}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}

function LanguageField({
  label,
  name,
  defaultValue
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium text-ink/70">{label}</span>
      <select
        className="h-11 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
        name={name}
        defaultValue={defaultValue}
      >
        {languageOptions.map((language) => (
          <option key={language} value={language}>
            {language}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextareaField({
  label,
  name,
  defaultValue,
  maxLength
}: {
  label: string;
  name: string;
  defaultValue: string;
  maxLength: number;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium text-ink/70">{label}</span>
      <textarea
        className="min-h-[116px] w-full resize-none rounded-md border border-ink/15 bg-paper/60 px-3 py-2 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
        defaultValue={defaultValue}
        maxLength={maxLength}
        name={name}
      />
    </label>
  );
}

function CheckboxField({
  label,
  name,
  defaultChecked,
  description
}: {
  label: string;
  name: string;
  defaultChecked: boolean;
  description: string;
}) {
  return (
    <label className="flex min-h-20 gap-3 rounded-md border border-ink/10 bg-paper/55 p-3">
      <input className="mt-1 h-4 w-4 accent-lagoon" defaultChecked={defaultChecked} name={name} type="checkbox" />
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-1 block text-sm text-ink/58">{description}</span>
      </span>
    </label>
  );
}
