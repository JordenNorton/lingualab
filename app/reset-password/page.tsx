import Link from "next/link";
import { redirect } from "next/navigation";
import { updatePassword } from "@/lib/auth-actions";
import { createClient } from "@/lib/supabase/server";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Use the password reset link from your email to continue.");
  }

  const { message } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-md rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
        <Link href="/" className="mb-6 inline-flex text-sm font-semibold text-lagoon">
          LinguaLab
        </Link>
        <h1 className="text-2xl font-semibold text-ink">Choose a new password</h1>
        <p className="mt-2 text-sm text-ink/62">Use at least 6 characters. You&apos;ll return to your dashboard after it updates.</p>

        {message ? <p className="mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm text-ink/75">{message}</p> : null}

        <form action={updatePassword} className="mt-6 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink/75">New password</span>
            <input
              className="h-11 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink/75">Confirm password</span>
            <input
              className="h-11 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center rounded-md bg-ink px-4 font-semibold text-white transition hover:bg-graphite"
          >
            Update password
          </button>
        </form>
      </section>
    </main>
  );
}
