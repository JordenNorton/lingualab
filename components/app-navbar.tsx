"use client";

import {
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  Languages,
  LogIn,
  LogOut,
  Settings,
  Sparkles,
  UserRound,
  UserPlus
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";

type NavItem = "studio" | "dashboard";

type AppNavbarProps = {
  activeItem?: NavItem | null;
  userEmail?: string | null;
  creditsRemaining?: number | null;
  showDashboardActions?: boolean;
};

function initialsFromEmail(email: string | null | undefined) {
  if (!email) return "IF";

  const name = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (!name) return "IF";

  const parts = name.split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2);

  return initials.toUpperCase();
}

export function AppNavbar({ activeItem = null, userEmail = null, creditsRemaining = null, showDashboardActions = false }: AppNavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isSignedIn = Boolean(userEmail);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/login");
  }

  return (
    <header className="app-navbar px-1 py-2.5">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="app-navbar-brand-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
            <Languages aria-hidden="true" size={20} />
          </span>
          <span className="app-navbar-brand truncate text-lg font-semibold tracking-normal">IntoFluency</span>
        </Link>

        <nav className="order-3 flex items-center gap-2 text-sm lg:order-none" aria-label="Primary navigation">
          <TopNavLink href="/" label="Studio" icon={Sparkles} active={activeItem === "studio"} />
          <TopNavLink
            href={isSignedIn ? "/dashboard" : "/login?message=Log in to view your dashboard."}
            label="Dashboard"
            icon={LayoutDashboard}
            active={activeItem === "dashboard"}
          />
        </nav>

        <div className="flex items-center justify-end gap-2">
          {showDashboardActions ? (
            <>
              <Link
                href="/pricing"
                className="app-navbar-action flex h-9 items-center gap-2 rounded-md px-2 text-sm font-semibold transition sm:px-3"
                aria-label="Plans"
              >
                <CreditCard size={15} aria-hidden="true" />
                <span className="hidden sm:inline">Plans</span>
              </Link>
              <Link
                href="/dashboard/settings"
                className="app-navbar-action flex h-9 w-9 items-center justify-center rounded-md transition"
                aria-label="Settings"
              >
                <Settings size={16} aria-hidden="true" />
              </Link>
            </>
          ) : null}

          {typeof creditsRemaining === "number" ? (
            <Link
              href="/pricing"
              className="app-navbar-credits flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition"
            >
              <Sparkles size={15} aria-hidden="true" />
              <span>{creditsRemaining} credits</span>
            </Link>
          ) : null}

          <div className="relative">
            <button
              type="button"
              className="app-navbar-profile flex h-9 items-center gap-1 rounded-md pl-1 pr-2 transition"
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
            >
              <span className="app-navbar-avatar flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold">
                {initialsFromEmail(userEmail)}
              </span>
              <ChevronDown size={14} aria-hidden="true" />
            </button>

            {isMenuOpen ? (
              <div className="app-navbar-menu absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg p-1 text-sm shadow-[0_22px_70px_rgba(0,0,0,0.18)]" role="menu">
                {isSignedIn ? (
                  <>
                    <p className="app-navbar-menu-muted truncate px-3 py-2 text-xs">{userEmail}</p>
                    <MenuLink href="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={() => setIsMenuOpen(false)} />
                    <MenuLink href="/dashboard/settings" icon={Settings} label="Account settings" onClick={() => setIsMenuOpen(false)} />
                    <MenuLink href="/pricing" icon={CreditCard} label="Plans" onClick={() => setIsMenuOpen(false)} />
                    <button
                      type="button"
                      className="app-navbar-menu-item flex w-full items-center gap-2 rounded-md px-3 py-2 text-left font-medium transition"
                      onClick={signOut}
                      role="menuitem"
                    >
                      <LogOut size={15} aria-hidden="true" />
                      <span>Log out</span>
                    </button>
                  </>
                ) : (
                  <>
                    <MenuLink href="/login" icon={LogIn} label="Log in" onClick={() => setIsMenuOpen(false)} />
                    <MenuLink href="/signup" icon={UserPlus} label="Start free" onClick={() => setIsMenuOpen(false)} />
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

function TopNavLink({
  href,
  label,
  icon: Icon,
  active
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "app-navbar-link relative flex h-9 items-center gap-2 rounded-md px-3 font-semibold transition",
        active && "app-navbar-link-active"
      )}
    >
      <Icon size={15} aria-hidden="true" />
      <span>{label}</span>
      {active ? <span className="absolute inset-x-3 bottom-0 h-px rounded-full bg-lagoon shadow-[0_0_12px_rgba(31,122,119,0.95)]" /> : null}
    </Link>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
  onClick
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      className="app-navbar-menu-item flex items-center gap-2 rounded-md px-3 py-2 font-medium transition"
      onClick={onClick}
      role="menuitem"
    >
      <Icon size={15} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
