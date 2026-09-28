"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Home, Database, CalendarCheck, RefreshCw, History, Users, PlusCircle, MoreHorizontal, LogOut, X, Menu, Inbox } from "lucide-react";
import { DeviceSwitch } from "./DeviceView";
import { ThemePicker } from "./ThemePicker";
import { NavProgress } from "./NavProgress";
import { ROLE_LABEL } from "@/lib/labels";
import type { MemberRole } from "@/lib/types";
import { logout } from "@/lib/actions/auth";
import { Logo } from "./Logo";

export interface ShellUser { name: string; role: MemberRole; orgName: string }

interface NavItem { href: string; label: string; icon: ReactNode; tile: string; match: (p: string, q: URLSearchParams) => boolean; testId?: string }

function navFor(role: MemberRole): { primary: NavItem[]; more: NavItem[]; cta?: { href: string; label: string } } {
  const home: NavItem = { href: "/", label: "홈", icon: <Home size={20} />, tile: "tile-blue", match: (p) => p === "/" };
  const isManager = role === "OWNER" || role === "MANAGER";
  if (isManager) {
    return {
      primary: [
        { ...home, label: "대시보드" },
        { href: "/leads", label: "DB 관리", icon: <Database size={20} />, tile: "tile-teal", match: (p) => p.startsWith("/leads") },
        { href: "/leads?tab=needs_report", label: "결과 미입력", icon: <Inbox size={20} />, tile: "tile-rose", match: (p, q) => p === "/leads" && q.get("tab") === "needs_report" },
        { href: "/follow-ups", label: "후속조치", icon: <RefreshCw size={20} />, tile: "tile-violet", match: (p) => p.startsWith("/follow-ups") },
        { href: "/activity", label: "전체 이력", icon: <History size={20} />, tile: "tile-amber", match: (p) => p.startsWith("/activity") },
      ],
      more: role === "OWNER" ? [{ href: "/members", label: "구성원 관리", icon: <Users size={20} />, tile: "tile-slate", match: (p) => p.startsWith("/members") }] : [],
      cta: { href: "/leads/new", label: "신규 DB 등록" },
    };
  }
  if (role === "CALLER") {
    return {
      primary: [
        home,
        { href: "/leads", label: "DB 관리", icon: <Database size={20} />, tile: "tile-teal", match: (p) => p.startsWith("/leads") && p !== "/leads/new" },
        { href: "/leads/new", label: "신규 DB 등록", icon: <PlusCircle size={20} />, tile: "tile-green", match: (p) => p === "/leads/new" },
      ],
      more: [],
      cta: { href: "/leads/new", label: "신규 DB 등록" },
    };
  }
  return {
    primary: [
      home,
      { href: "/leads?tab=open", label: "신청 가능 DB", icon: <Database size={20} />, tile: "tile-amber", match: (p, q) => p === "/leads" && (q.get("tab") ?? "open") === "open" },
      { href: "/leads?tab=mine", label: "내 미팅", icon: <CalendarCheck size={20} />, tile: "tile-green", match: (p, q) => (p === "/leads" && q.get("tab") === "mine") || /^\/leads\/[^/]+/.test(p) },
      { href: "/follow-ups", label: "후속조치", icon: <RefreshCw size={20} />, tile: "tile-violet", match: (p) => p.startsWith("/follow-ups") },
    ],
    more: [],
  };
}

export function AppShell({ user, children, demo = false, topBar }: { user: ShellUser; children: ReactNode; demo?: boolean; topBar?: ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const [drawer, setDrawer] = useState(false);
  // Highlight the tapped tab immediately, before the server responds.
  const [tapped, setTapped] = useState<string | null>(null);
  const nav = navFor(user.role);
  const all = [...nav.primary, ...nav.more];
  useEffect(() => { setDrawer(false); setTapped(null); }, [pathname, search]);
  // A login form submitted from a scrolled page must not carry its scroll offset into the app.
  useEffect(() => window.scrollTo(0, 0), []);

  const isActive = (item: NavItem) => {
    if (tapped) return tapped === item.href;
    return item.match(pathname, search);
  };
  const tap = (href: string) => () => setTapped(href);

  return (
    <div className="flex min-h-dvh w-full bg-canvas">
      <NavProgress />
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-[250px] shrink-0 flex-col bg-shell text-white lg:flex" data-testid="sidebar">
        <div className="px-5 pb-4 pt-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={34} />
            <div className="leading-tight">
              <div className="text-[19px] font-extrabold tracking-tight">리드플로우</div>
              <div className="text-[12.5px] text-[#aeb7c3]">DB부터 만남까지, 성과로</div>
            </div>
          </Link>
        </div>
        {nav.cta && (
          <div className="px-4 pb-3">
            <Link href={nav.cta.href} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-[16px] font-bold text-white transition-base hover:bg-primary-strong">
              <PlusCircle size={19} /> {nav.cta.label}
            </Link>
          </div>
        )}
        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {all.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={tap(item.href)}
                aria-current={active ? "page" : undefined}
                className={`press group relative flex h-12 items-center gap-3 rounded-xl px-3 text-[16px] font-semibold ${active ? "bg-white/12 text-white" : "text-[#e5e7eb] hover:bg-white/8 hover:text-white"}`}
              >
                <span className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-white transition-all duration-200 ${active ? "opacity-100" : "opacity-0"}`} />
                <span className={`icon-tile ${item.tile} transition-transform duration-200 group-hover:scale-110`}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-4 py-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-[16px] font-bold">{user.name.slice(0, 1)}</span>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[16px] font-bold text-white">{user.name}</div>
              <div className="text-[13.5px] text-[#aeb7c3]">{ROLE_LABEL[user.role]} · {user.orgName}</div>
            </div>
          </div>
          {!demo && (
            <form action={logout}>
              <button type="submit" className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/15 text-[14.5px] font-semibold text-[#e5e7eb] transition-base hover:bg-white/10">
                <LogOut size={16} /> 로그아웃
              </button>
            </form>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {topBar}
        {/* Top header */}
        <header className="@container/header sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-white/95 px-4 backdrop-blur lg:h-[68px] lg:px-8">
          <div className="flex items-center gap-2.5 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <Logo size={30} />
              <span className="text-[18px] font-extrabold tracking-tight text-ink">리드플로우</span>
            </Link>
          </div>
          <div className="hidden min-w-0 items-center gap-2 lg:flex">
            <span className="truncate whitespace-nowrap text-[15px] font-semibold text-ink-2">{user.orgName}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemePicker />
            <DeviceSwitch />
            <div className="hidden items-center gap-2 whitespace-nowrap rounded-xl border border-line bg-white py-1.5 pl-1.5 pr-3 @4xl/header:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-soft text-[14px] font-bold text-primary">{user.name.slice(0, 1)}</span>
              <span className="text-[15px] font-semibold text-ink">{user.name} <span className="text-ink-3">{ROLE_LABEL[user.role]}</span></span>
            </div>
            <button type="button" onClick={() => setDrawer(true)} aria-label="메뉴 열기" className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-2 hover:bg-neutral-bg lg:hidden" data-testid="menu-button">
              <Menu size={24} />
            </button>
          </div>
        </header>

        <main className="@container mx-auto w-full max-w-[1400px] flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-12 lg:pt-7">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden" style={{ gridTemplateColumns: `repeat(${Math.min(nav.primary.length, 4) + 1}, 1fr)` }} data-testid="bottom-nav">
        {nav.primary.slice(0, 4).map((item) => {
          const active = isActive(item);
          return (
            <Link key={item.href} href={item.href} prefetch onClick={tap(item.href)} aria-current={active ? "page" : undefined} className={`press relative flex h-[64px] flex-col items-center justify-center gap-0.5 text-[12.5px] font-semibold ${active ? "text-primary" : "text-ink-2"}`}>
              <span className={`absolute top-0 h-[3px] w-10 rounded-b-full bg-primary transition-all duration-200 ${active ? "opacity-100" : "scale-x-0 opacity-0"}`} />
              <span className={`transition-transform duration-200 ${active ? "-translate-y-0.5" : ""}`}>{item.icon}</span>
              <span>{item.label.replace(" DB", "").replace("관리", "")}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setDrawer(true)} className="press flex h-[64px] flex-col items-center justify-center gap-0.5 text-[12.5px] font-semibold text-ink-2">
          <MoreHorizontal size={20} />
          <span>더보기</span>
        </button>
      </nav>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 bg-ink/45 lg:hidden" onClick={() => setDrawer(false)} data-testid="drawer">
          <div className="fade-up absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 pb-[calc(20px+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-soft text-[17px] font-bold text-primary">{user.name.slice(0, 1)}</span>
                <div className="leading-tight">
                  <div className="text-[17px] font-bold text-ink">{user.name}</div>
                  <div className="text-[14px] text-ink-3">{ROLE_LABEL[user.role]} · {user.orgName}</div>
                </div>
              </div>
              <button type="button" onClick={() => setDrawer(false)} aria-label="닫기" className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-3 hover:bg-neutral-bg"><X size={22} /></button>
            </div>
            <div className="grid gap-1.5">
              {nav.cta && (
                <Link href={nav.cta.href} className="flex h-13 items-center gap-3 rounded-xl bg-primary px-3 text-[16px] font-bold text-white" style={{ height: 52 }}>
                  <PlusCircle size={20} /> {nav.cta.label}
                </Link>
              )}
              {all.map((item) => (
                <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-xl px-3 text-[16px] font-semibold ${isActive(item) ? "bg-soft text-primary" : "text-ink hover:bg-neutral-bg"}`} style={{ height: 52 }}>
                  <span className={`icon-tile ${item.tile}`} style={{ background: "var(--neutral-canvas)", color: "var(--theme-primary)" }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              <ThemePicker variant="row" onPicked={() => setDrawer(false)} />
              {!demo && (
                <form action={logout}>
                  <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 text-[16px] font-semibold text-ink-2 hover:bg-neutral-bg" style={{ height: 52 }}>
                    <span className="icon-tile" style={{ background: "var(--neutral-canvas)", color: "var(--neutral-text-secondary)" }}><LogOut size={20} /></span> 로그아웃
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
