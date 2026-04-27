import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/lib/auth-actions";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login?message=Log in to view your dashboard.");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-ink/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="text-sm font-semibold text-lagoon">
            LinguaLab
          </Link>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-ink/62">{user.email}</p>
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

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardMetric label="Saved lessons" value="0" />
        <DashboardMetric label="Quiz attempts" value="0" />
        <DashboardMetric label="Vocabulary cards" value="0" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-semibold text-ink">Learning history</h2>
          <p className="mt-2 text-sm text-ink/62">
            Saved lessons and workbook attempts will appear here once we move Phase 1 progress from browser storage into
            Supabase.
          </p>
          <div className="mt-5 rounded-md border border-dashed border-ink/20 bg-paper/50 p-6 text-sm text-ink/55">
            No saved lessons yet.
          </div>
        </div>

        <aside className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-semibold text-ink">Next Phase 2 steps</h2>
          <ul className="mt-4 space-y-3 text-sm text-ink/68">
            <li>- Store generated lessons against your account.</li>
            <li>- Save vocabulary from each lesson.</li>
            <li>- Track quiz scores and weak areas.</li>
            <li>- Add retention prompts and review scheduling.</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}

function DashboardMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
      <p className="text-sm font-medium text-ink/55">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}
