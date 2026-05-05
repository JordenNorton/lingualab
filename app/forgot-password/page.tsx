import Link from "next/link";
import { redirect } from "next/navigation";
import { requestPasswordReset } from "@/lib/auth-actions";
import { createClient } from "@/lib/supabase/server";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
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
      <section className="w-full max-w-md rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
        <Link href="/" className="mb-6 inline-flex text-sm font-semibold text-lagoon">
          IntoFluency
        </Link>
        <h1 className="text-2xl font-semibold text-ink">Reset password</h1>
        <p className="mt-2 text-sm text-ink/62">Enter your email and we&apos;ll send a secure link to choose a new password.</p>

        {message ? <p className="mt-4 rounded-md bg-saffron/10 px-3 py-2 text-sm text-ink/75">{message}</p> : null}

        <form action={requestPasswordReset} className="mt-6 space-y-4">
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
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center rounded-md bg-ink px-4 font-semibold text-white transition hover:bg-graphite"
          >
            Send reset link
          </button>
        </form>

        <p className="mt-5 text-sm text-ink/62">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-lagoon">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
