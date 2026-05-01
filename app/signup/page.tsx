import Link from "next/link";
import { redirect } from "next/navigation";
import { signup } from "@/lib/auth-actions";
import { languageOptions, levels } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

type SignupPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const { message } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-lg rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
        <Link href="/" className="mb-6 inline-flex text-sm font-semibold text-lagoon">
          LinguaLab
        </Link>
        <h1 className="text-2xl font-semibold text-ink">Create an account</h1>
        <p className="mt-2 text-sm text-ink/62">Start saving lessons and building your learning history.</p>

        {message ? <p className="mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm text-ink/75">{message}</p> : null}

        <form action={signup} className="mt-6 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink/75">Email</span>
            <input
              className="h-11 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink/75">Password</span>
            <input
              className="h-11 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-ink/75">Learning language</span>
              <select
                className="h-11 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
                name="targetLanguage"
                defaultValue="Spanish"
                required
              >
                {languageOptions.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-ink/75">Native language</span>
              <select
                className="h-11 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
                name="nativeLanguage"
                defaultValue="English"
                required
              >
                {languageOptions.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-ink/75">Current level</span>
              <select
                className="h-11 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
                name="currentLevel"
                defaultValue="A2"
                required
              >
                {levels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-ink/75">Regional variant</span>
              <input
                className="h-11 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
                name="regionVariant"
                defaultValue="Latin American Spanish"
                maxLength={80}
              />
            </label>
          </div>
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center rounded-md bg-ink px-4 font-semibold text-white transition hover:bg-graphite"
          >
            Sign up
          </button>
        </form>

        <p className="mt-5 text-sm text-ink/62">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-lagoon">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
