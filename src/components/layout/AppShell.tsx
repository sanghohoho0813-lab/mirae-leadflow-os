"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Home, Database, CalendarCheck, RefreshCw, History, Users, PlusCircle, MoreHorizontal, LogOut, X, Menu, Inbox, Megaphone } from "lucide-react";
import { DeviceSwitch } from "./DeviceView";
import { ThemePicker } from "./ThemePicker";
import { NavProgress } from "./NavProgress";
import { ROLE_LABEL } from "@/lib/labels";
import type { MemberRole } from "@/lib/types";
import { logout } from "@/lib/actions/auth";
import { Logo } from "./Logo";

export interface ShellUser { name: string; role: MemberRole; orgName: string }

/** Live counts shown as badges on the menu (what needs attention now). */
export interface NavCounts { needs_report: number; follow_ups: number; open: number; drafts: number }

type BadgeKey = keyof NavCounts;
interface NavItem {
  href: string;
  label: string;
  /** Label under the icon in the mobile bottom bar. */
  short?: string;
  icon: ReactNode;
  match: (p: string, q: URLSearchParams) => boolean;
  badge?: { key: BadgeKey; urgent?: boolean };
}
interface NavSection { title: string; items: NavItem[] }
interface NavConfig { sections: NavSection[]; bottom: NavItem[]; cta?: { href: string; label: string } }

const I = 20;
const isLeadsTab = (p: string, q: URLSearchParams, tab: string | null) => p === "/leads" && (q.get("tab") ?? null) === tab;

function navFor(role: MemberRole): NavConfig {
  const home: NavItem = { href: "/", label: "홈", icon: <Home size={I} />, match: (p) => p === "/" };
  if (role === "OWNER" || role === "MANAGER") {
    const dash = { ...home, label: "대시보드" };
    const needs: NavItem = { href: "/leads?tab=needs_report", label: "결과 미입력", icon: <Inbox size={I} />, match: (p, q) => isLeadsTab(p, q, "needs_report"), badge: { key: "needs_report", urgent: true } };
    const follow: NavItem = { href: "/follow-ups", label: "후속조치", icon: <RefreshCw size={I} />, match: (p) => p.startsWith("/follow-ups"), badge: { key: "follow_ups" } };
    const leads: NavItem = { href: "/leads", label: "DB 관리", short: "DB", icon: <Database size={I} />, match: (p, q) => p.startsWith("/leads") && !isLeadsTab(p, q, "needs_report") && p !== "/leads/new" };
    const drafts: NavItem = { href: "/leads?tab=draft", label: "공개 대기", icon: <Megaphone size={I} />, match: (p, q) => isLeadsTab(p, q, "draft"), badge: { key: "drafts" } };
    const history: NavItem = { href: "/activity", label: "전체 이력", icon: <History size={I} />, match: (p) => p.startsWith("/activity") };
    const members: NavItem = { href: "/members", label: "구성원 관리", icon: <Users size={I} />, match: (p) => p.startsWith("/members") };
    return {
      sections: [
        { title: "오늘 업무", items: [dash, needs, follow] },
        { title: "DB", items: [leads, drafts] },
        { title: "관리", items: role === "OWNER" ? [history, members] : [history] },
      ],
      bottom: [dash, leads, needs, follow],
      cta: { href: "/leads/new", label: "신규 DB 등록" },
    };
  }
  if (role === "CALLER") {
    const leads: NavItem = { href: "/leads", label: "DB 관리", short: "DB", icon: <Database size={I} />, match: (p) => p.startsWith("/leads") && p !== "/leads/new" };
    const create: NavItem = { href: "/leads/new", label: "신규 DB 등록", short: "등록", icon: <PlusCircle size={I} />, match: (p) => p === "/leads/new" };
    return {
      sections: [
        { title: "오늘 업무", items: [home, create] },
        { title: "DB", items: [leads] },
      ],
      bottom: [home, leads, create],
      cta: { href: "/leads/new", label: "신규 DB 등록" },
    };
  }
  const mine: NavItem = { href: "/leads?tab=mine", label: "내 미팅", icon: <CalendarCheck size={I} />, match: (p, q) => isLeadsTab(p, q, "mine") || /^\/leads\/[^/]+/.test(p), badge: { key: "needs_report", urgent: true } };
  const follow: NavItem = { href: "/follow-ups", label: "후속조치", icon: <RefreshCw size={I} />, match: (p) => p.startsWith("/follow-ups"), badge: { key: "follow_ups" } };
  const open: NavItem = { href: "/leads?tab=open", label: "신청 가능 DB", short: "신청 가능", icon: <Database size={I} />, match: (p, q) => p === "/leads" && (q.get("tab") ?? "open") === "open", badge: { key: "open" } };
  return {
    sections: [
      { title: "내 업무", items: [home, mine, follow] },
      { title: "DB", items: [open] },
    ],
    bottom: [home, open, mine, follow],
  };
}

function Count({ n, urgent, variant }: { n: number; urgent?: boolean; variant: "dark" | "light" | "dot" }) {
  if (!n) return null;
  const text = n > 99 ? "99+" : String(n);
  if (variant === "dot") {
    return <span className={`absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-bold text-white ring-2 ring-white ${urgent ? "bg-danger" : "bg-primary"}`}>{text}</span>;
  }
  const tone = urgent ? "bg-danger text-white" : variant === "dark" ? "bg-white/15 text-white" : "bg-neutral-bg text-ink-2";
  return <span className={`ml-auto flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[13px] font-bold tabular-nums ${tone}`}>{text}</span>;
}

export function AppShell({ user, children, demo = false, topBar, counts }: { user: ShellUser; children: ReactNode; demo?: boolean; topBar?: ReactNode; counts: NavCounts }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const [drawer, setDrawer] = useState(false);
  // Highlight the tapped tab immediately, before the server responds.
  const [tapped, setTapped] = useState<string | null>(null);
  const nav = navFor(user.role);
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
          <Link prefetch={false} href="/" className="flex items-center gap-2.5">
            <Logo size={34} />
            <div className="leading-tight">
              <div className="text-[19px] font-extrabold tracking-tight">리드플로우</div>
              <div className="text-[12.5px] text-[#aeb7c3]">DB부터 만남까지, 성과로</div>
            </div>
          </Link>
        </div>
        {nav.cta && (
          <div className="px-4 pb-3">
            <Link prefetch={false} href={nav.cta.href} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-[16px] font-bold text-white transition-base hover:bg-primary-strong">
              <PlusCircle size={19} /> {nav.cta.label}
            </Link>
          </div>
        )}
        <nav className="flex flex-1 flex-col overflow-y-auto px-3 pb-3" aria-label="메뉴">
          {nav.sections.map((sec) => (
            <div key={sec.title} className="mt-3 first:mt-1">
              <div className="px-3 pb-1.5 text-[12.5px] font-semibold tracking-wide text-[#94a3b8]">{sec.title}</div>
              <div className="flex flex-col gap-0.5">
                {sec.items.map((item) => {
                  const active = isActive(item);
                  return (
                    <Link prefetch={false}
                      key={item.href}
                      href={item.href}
                      onClick={tap(item.href)}
                      aria-current={active ? "page" : undefined}
                      className={`press group relative flex h-12 items-center gap-3 rounded-xl px-2.5 text-[16px] font-semibold ${active ? "bg-white/[0.11] text-white" : "text-[#e2e8f0] hover:bg-white/[0.06] hover:text-white"}`}
                    >
                      <span className={`nav-icon ${active ? "nav-icon-active" : ""}`}>{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                      {item.badge && <Count n={counts[item.badge.key]} urgent={item.badge.urgent} variant="dark" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
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
            <Link prefetch={false} href="/" className="flex items-center gap-2">
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
      <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-white/97 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" style={{ gridTemplateColumns: `repeat(${nav.bottom.length + 1}, 1fr)` }} data-testid="bottom-nav" aria-label="하단 메뉴">
        {nav.bottom.map((item) => {
          const active = isActive(item);
          return (
            <Link prefetch={false} key={item.href} href={item.href} onClick={tap(item.href)} aria-current={active ? "page" : undefined} className={`press relative flex h-[64px] flex-col items-center justify-center gap-0.5 text-[12.5px] font-semibold ${active ? "text-primary" : "text-ink-2"}`}>
              <span className={`absolute top-0 h-[3px] w-10 rounded-b-full bg-primary transition-all duration-200 ${active ? "opacity-100" : "scale-x-0 opacity-0"}`} />
              <span className={`relative transition-transform duration-200 ${active ? "-translate-y-0.5" : ""}`}>
                {item.icon}
                {item.badge && <Count n={counts[item.badge.key]} urgent={item.badge.urgent} variant="dot" />}
              </span>
              <span>{item.short ?? item.label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setDrawer(true)} className="press flex h-[64px] flex-col items-center justify-center gap-0.5 text-[12.5px] font-semibold text-ink-2" aria-label="더보기 메뉴">
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
                <Link prefetch={false} href={nav.cta.href} className="flex h-13 items-center gap-3 rounded-xl bg-primary px-3 text-[16px] font-bold text-white" style={{ height: 52 }}>
                  <PlusCircle size={20} /> {nav.cta.label}
                </Link>
              )}
              {nav.sections.map((sec) => (
                <div key={sec.title}>
                  <div className="px-3 pb-1 pt-2 text-[13px] font-semibold text-ink-3">{sec.title}</div>
                  {sec.items.map((item) => (
                    <Link prefetch={false} key={item.href} href={item.href} className={`press flex items-center gap-3 rounded-xl px-3 text-[16px] font-semibold ${isActive(item) ? "bg-soft text-primary" : "text-ink hover:bg-neutral-bg"}`} style={{ height: 52 }}>
                      <span className={`nav-icon-light ${isActive(item) ? "nav-icon-light-active" : ""}`}>{item.icon}</span>
                      {item.label}
                      {item.badge && <Count n={counts[item.badge.key]} urgent={item.badge.urgent} variant="light" />}
                    </Link>
                  ))}
                </div>
              ))}
              <div className="px-3 pb-1 pt-2 text-[13px] font-semibold text-ink-3">설정</div>
              <ThemePicker variant="row" onPicked={() => setDrawer(false)} />
              {!demo && (
                <form action={logout}>
                  <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 text-[16px] font-semibold text-ink-2 hover:bg-neutral-bg" style={{ height: 52 }}>
                    <span className="nav-icon-light"><LogOut size={20} /></span> 로그아웃
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
