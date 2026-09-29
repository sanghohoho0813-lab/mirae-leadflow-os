"use client";

import { MiniCalendar, type TrainingDays } from "./MiniCalendar";
import { PersonaMenu } from "./PersonaMenu";
import type { DemoTools } from "./DemoTools";
import { IntroVideo, shouldAutoOpenIntro } from "./IntroVideo";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { PlayCircle, Home, Database, CalendarCheck, RefreshCw, History, Users, PlusCircle, MoreHorizontal, LogOut, X, Menu, Inbox, Megaphone, GraduationCap, Settings, CalendarDays, Building } from "lucide-react";
import { NavProgress } from "./NavProgress";
import { LiveClock } from "./LiveClock";
import { personLabel, ROLE_LABEL } from "@/lib/labels";
import type { MemberRole } from "@/lib/types";
import { logout } from "@/lib/actions/auth";
import { Logo } from "./Logo";

export interface ShellUser { name: string; role: MemberRole; title: string | null; division: string | null; orgName: string; leader: boolean; usesDb: boolean }

/** Live counts shown as badges on the menu (what needs attention now). */
export interface NavCounts { needs_report: number; follow_ups: number; open: number; drafts: number; trainings: number }

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

/**
 * 목차 묶음마다 한 가지 연한 색 (아이콘 칸에만). 오늘 업무 = 하늘 · DB = 초록 · 교육 = 라벤더 ·
 * 관리/본부 = 금색 · 설정 = 회색. 지금 위치 표시(살구색)는 그대로 두고 색만 더한다.
 */
function navTone(title: string): string {
  if (title === "오늘 업무" || title === "내 업무") return "work";
  if (title === "DB") return "db";
  if (title === "교육") return "edu";
  if (title === "설정") return "settings";
  return "admin";
}
interface NavConfig { sections: NavSection[]; bottom: NavItem[]; cta?: { href: string; label: string } }

const I = 20;
const isLeadsTab = (p: string, q: URLSearchParams, tab: string | null) => p === "/leads" && (q.get("tab") ?? null) === tab;

function navFor(user: ShellUser): NavConfig {
  const role = user.role;
  const home: NavItem = { href: "/", label: "홈", icon: <Home size={I} />, match: (p) => p === "/" };
  const training: NavItem = { href: "/trainings", label: "교육 자료실", short: "교육", icon: <GraduationCap size={I} />, match: (p) => p.startsWith("/trainings") && !p.startsWith("/trainings/schedule"), badge: { key: "trainings" } };
  const schedule: NavItem = { href: "/trainings/schedule", label: "교육 일정", short: "일정", icon: <CalendarDays size={I} />, match: (p) => p.startsWith("/trainings/schedule") };
  const education: NavSection = { title: "교육", items: [training, schedule] };
  const follow: NavItem = { href: "/follow-ups", label: "후속조치", icon: <RefreshCw size={I} />, match: (p) => p.startsWith("/follow-ups"), badge: { key: "follow_ups" } };
  const settings: NavSection = { title: "설정", items: [{ href: "/settings", label: "설정 · 글자 크기", icon: <Settings size={I} />, match: (p) => p.startsWith("/settings") }] };
  const members: NavItem = { href: "/members", label: "구성원 관리", icon: <Users size={I} />, match: (p) => p.startsWith("/members") };
  if (role === "OWNER" || role === "MANAGER") {
    const needs: NavItem = { href: "/leads?tab=needs_report", label: "결과 미입력", short: "미입력", icon: <Inbox size={I} />, match: (p, q) => isLeadsTab(p, q, "needs_report"), badge: { key: "needs_report", urgent: true } };
    const leads: NavItem = { href: "/leads", label: "DB 관리", short: "DB", icon: <Database size={I} />, match: (p, q) => p.startsWith("/leads") && !isLeadsTab(p, q, "needs_report") && !isLeadsTab(p, q, "draft") && p !== "/leads/new" };
    const drafts: NavItem = { href: "/leads?tab=draft", label: "공개 대기", icon: <Megaphone size={I} />, match: (p, q) => isLeadsTab(p, q, "draft"), badge: { key: "drafts" } };
    const history: NavItem = { href: "/activity", label: "전체 이력", icon: <History size={I} />, match: (p) => p.startsWith("/activity") };
    return {
      sections: [
        { title: "오늘 업무", items: [home, needs, follow] },
        { title: "DB", items: [leads, drafts] },
        education,
        { title: "관리", items: [history, members] },
        settings,
      ],
      bottom: [home, leads, needs, training],
      cta: { href: "/leads/new", label: "신규 DB 등록" },
    };
  }
  if (role === "CALLER") {
    const leads: NavItem = { href: "/leads", label: "DB 관리", short: "DB", icon: <Database size={I} />, match: (p) => p.startsWith("/leads") && p !== "/leads/new" };
    const create: NavItem = { href: "/leads/new", label: "신규 DB 등록", short: "등록", icon: <PlusCircle size={I} />, match: (p) => p === "/leads/new" };
    return {
      sections: [
        { title: "오늘 업무", items: [home, create, leads] },
        education,
        settings,
      ],
      bottom: [home, create, leads, training],
      cta: { href: "/leads/new", label: "신규 DB 등록" },
    };
  }
  // 광주 상무본부 등 교육만 쓰는 본부
  if (!user.usesDb) {
    // 이 본부의 본부장은 본부원 관리(직함)만 더한다.
    const mgmt: NavSection[] = user.leader ? [{ title: user.division ?? "우리 본부", items: [{ ...members, label: "본부원 관리" }] }] : [];
    return { sections: [{ title: "내 업무", items: [home] }, education, ...mgmt, settings], bottom: [home, training, schedule] };
  }
  const open: NavItem = { href: "/leads?tab=open", label: "신청 가능 DB", short: "신청 가능", icon: <Database size={I} />, match: (p, q) => p === "/leads" && (q.get("tab") ?? "open") === "open", badge: { key: "open" } };
  const mine: NavItem = { href: "/leads?tab=mine", label: "내 미팅", icon: <CalendarCheck size={I} />, match: (p, q) => isLeadsTab(p, q, "mine") || /^\/leads\/[^/]+/.test(p), badge: { key: "needs_report", urgent: true } };
  if (user.leader) {
    const create: NavItem = { href: "/leads/new", label: "본부 DB 등록", icon: <PlusCircle size={I} />, match: (p) => p === "/leads/new" };
    const division: NavItem = { href: "/leads?tab=division", label: "본부 DB", short: "본부 DB", icon: <Building size={I} />, match: (p, q) => isLeadsTab(p, q, "division") || isLeadsTab(p, q, "draft"), badge: { key: "drafts" } };
    return {
      sections: [
        { title: "내 업무", items: [home, open, { ...mine, match: (p, q) => isLeadsTab(p, q, "mine") }, follow] },
        { title: user.division ?? "우리 본부", items: [create, division, { ...members, label: "본부원 관리" }] },
        education,
        settings,
      ],
      bottom: [home, open, division, training],
    };
  }
  return {
    sections: [
      { title: "내 업무", items: [home, open, mine, follow] },
      education,
      settings,
    ],
    bottom: [home, open, mine, training],
  };
}

function Count({ n, urgent, variant }: { n: number; urgent?: boolean; variant: "dark" | "light" | "dot" }) {
  if (!n) return null;
  const text = n > 99 ? "99+" : String(n);
  if (variant === "dot") {
    return <span className={`absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[0.6875rem] font-bold text-white ring-2 ring-white ${urgent ? "bg-danger" : "bg-primary"}`}>{text}</span>;
  }
  const tone = urgent ? "bg-danger text-white" : variant === "dark" ? "bg-white/15 text-white" : "bg-neutral-bg text-ink-2";
  return <span className={`ml-auto flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[0.8125rem] font-bold tabular-nums ${tone}`}>{text}</span>;
}

function OrgPill({ name, dark }: { name: string; dark?: boolean }) {
  return (
    <span className={`truncate rounded-md px-1.5 py-0.5 text-[0.7812rem] font-bold ${dark ? "bg-highlight/20 text-highlight" : "bg-soft text-primary"}`} data-testid="org-name">
      {name}
    </span>
  );
}

function MadeBy({ dark }: { dark?: boolean }) {
  return <div className={`text-center text-[0.75rem] tracking-wide ${dark ? "text-white/40" : "text-ink-3/80"}`} data-testid="made-by">미래AI랩 · 김상호 기획 및 제작</div>;
}

export function AppShell({ user, children, demo = false, topBar, counts, trainingDays, tools }: { user: ShellUser; children: ReactNode; demo?: boolean; topBar?: ReactNode; counts: NavCounts; trainingDays?: TrainingDays;
  /** 체험 모드: 사용자 변경하기 · 샘플 DB 추가·삭제. */
  tools?: DemoTools }) {
  // 서비스 소개 영상: 링크로 들어오면 가운데에 뜬다 (하루 동안 안 보기 / 다시 보지 않기 전까지).
  const [intro, setIntro] = useState(false);
  const closeIntro = useCallback(() => setIntro(false), []);
  useEffect(() => { if (shouldAutoOpenIntro()) setIntro(true); }, []);
  const pathname = usePathname();
  const search = useSearchParams();
  const [drawer, setDrawer] = useState(false);
  // Highlight the tapped tab immediately, before the server responds.
  const [tapped, setTapped] = useState<string | null>(null);
  const nav = navFor(user);
  useEffect(() => { setDrawer(false); setTapped(null); setPending(false); }, [pathname, search]);
  // 링크를 누르는 순간 이전 화면을 치우고 자리표시를 띄운다 (서버 응답을 기다리며 멈춘 느낌 없애기).
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download") || !a.href) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setPending(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setPending(false), 12000); // 절대 멈춰 있지 않게
    return () => clearTimeout(t);
  }, [pending]);
  // A login form submitted from a scrolled page must not carry its scroll offset into the app.
  useEffect(() => window.scrollTo(0, 0), []);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer]);

  const isActive = (item: NavItem) => {
    if (tapped) return tapped === item.href;
    return item.match(pathname, search);
  };
  const tap = (href: string) => () => setTapped(href);
  const who = personLabel(user.name, user.role, user.title);

  return (
    <div className="flex min-h-dvh w-full bg-canvas">
      <NavProgress />
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-[15.75rem] shrink-0 flex-col bg-shell text-white lg:flex" data-testid="sidebar">
        <div className="px-5 pb-4 pt-6">
          <Link prefetch={false} href="/" className="flex items-center gap-2.5">
            <Logo size={34} />
            <div className="min-w-0 leading-tight">
              <div className="text-[1.1875rem] font-extrabold tracking-tight">리드플로우</div>
              <div className="mt-0.5 flex"><OrgPill name={user.orgName} dark /></div>
            </div>
          </Link>
        </div>
        {nav.cta && (
          <div className="px-4 pb-3">
            <Link prefetch={false} href={nav.cta.href} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-[1rem] font-bold text-white transition-base hover:bg-primary-strong">
              <PlusCircle size={19} /> {nav.cta.label}
            </Link>
          </div>
        )}
        <nav className="flex flex-1 flex-col overflow-y-auto px-3 pb-3" aria-label="메뉴">
          {nav.sections.map((sec) => (
            <div key={sec.title} className="mt-3 first:mt-1" data-tone={navTone(sec.title)}>
              <div className="px-3 pb-1.5 text-[0.7812rem] font-semibold tracking-wide text-white/50">{sec.title}</div>
              <div className="flex flex-col gap-0.5">
                {sec.items.map((item) => {
                  const active = isActive(item);
                  return (
                    <Link prefetch={false}
                      key={item.href}
                      href={item.href}
                      onClick={tap(item.href)}
                      aria-current={active ? "page" : undefined}
                      className={`press group relative flex min-h-12 items-center gap-3 rounded-xl px-2.5 py-1 text-[1rem] font-semibold ${active ? "bg-white/[0.12] text-white" : "text-white/85 hover:bg-white/[0.06] hover:text-white"}`}
                    >
                      <span className={`nav-icon ${active ? "nav-icon-active" : ""}`}>{item.icon}</span>
                      <span className="min-w-0 flex-1 break-keep leading-tight">{item.label}</span>
                      {item.badge && <Count n={counts[item.badge.key]} urgent={item.badge.urgent} variant="dark" />}
                    </Link>
                  );
                })}
              </div>
              {/* 교육 section: a small month calendar right under 교육 일정 */}
              {sec.title === "교육" && trainingDays && <div className="mt-2 px-1"><MiniCalendar data={trainingDays} dark /></div>}
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 px-4 pb-3 pt-4">
          {(() => {
            const me = (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-[1rem] font-bold">{user.name.slice(0, 1)}</span>
                <div className="min-w-0 leading-tight">
                  <div className="truncate text-[1rem] font-bold text-white">{user.name}</div>
                  <div className="break-keep text-[0.8438rem] leading-snug text-white/60">{[user.division, user.title ?? ROLE_LABEL[user.role]].filter(Boolean).join(" ")}</div>
                </div>
              </>
            );
            return tools
              ? <div className="mb-3 -mx-1.5">
                  <PersonaMenu people={tools.people} currentId={tools.currentId} testId="sidebar-persona">{me}</PersonaMenu>
                  <div className="mt-0.5 px-1.5 text-[0.75rem] text-white/45">이름을 누르면 사용자 변경</div>
                </div>
              : <div className="mb-3 flex items-center gap-3">{me}</div>;
          })()}
          {!demo && (
            <form action={logout} className="mb-3">
              <button type="submit" className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/15 text-[0.9062rem] font-semibold text-white/85 transition-base hover:bg-white/10">
                <LogOut size={16} /> 로그아웃
              </button>
            </form>
          )}
          <button type="button" onClick={() => setIntro(true)} data-testid="sidebar-intro"
            className="mb-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg text-[0.9062rem] font-semibold text-white/75 transition-base hover:bg-white/10 hover:text-white">
            <PlayCircle size={17} /> 서비스 소개 영상 보기
          </button>
          <MadeBy dark />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {topBar}
        {/* Top header */}
        <header className="@container/header sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-line bg-white/95 px-3 backdrop-blur lg:h-[68px] lg:px-8">
          <div className="flex min-w-0 items-center gap-1.5 lg:hidden">
            <button type="button" onClick={() => setDrawer(true)} aria-label="메뉴 열기" className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-neutral-bg" data-testid="menu-button">
              <Menu size={25} />
            </button>
            <Link prefetch={false} href="/" className="flex min-w-0 items-center gap-2">
              <Logo size={30} />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="text-[1.0625rem] font-extrabold tracking-tight text-ink">리드플로우</span>
                <span className="flex"><OrgPill name={user.orgName} /></span>
              </span>
            </Link>
          </div>
          <div className="hidden min-w-0 items-center lg:flex">
            <LiveClock />
          </div>
          <div className="flex items-center gap-2">
            <div className="lg:hidden"><LiveClock variant="stacked" /></div>
            <Link prefetch={false} href="/settings" className="press hidden h-11 items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 text-[0.9375rem] font-semibold text-ink-2 hover:border-primary/40 hover:text-primary lg:inline-flex" data-testid="settings-link">
              <Settings size={18} /> 설정
            </Link>
            <div className="hidden items-center gap-2 whitespace-nowrap rounded-xl border border-line bg-white py-1.5 pl-1.5 pr-3 @3xl/header:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-soft text-[0.875rem] font-bold text-primary">{user.name.slice(0, 1)}</span>
              <span className="text-[0.9375rem] font-semibold text-ink">{who}</span>
            </div>
          </div>
        </header>

        <main className="@container mx-auto w-full max-w-[1400px] flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-12 lg:pt-7">
          {pending && <PageSkeleton />}
          <div key={pathname} className={pending ? "hidden" : "page-enter"} data-testid="page">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-white/97 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" style={{ gridTemplateColumns: `repeat(${nav.bottom.length + 1}, 1fr)` }} data-testid="bottom-nav" aria-label="하단 메뉴">
        {nav.bottom.map((item) => {
          const active = isActive(item);
          return (
            <Link prefetch={false} key={item.href} href={item.href} onClick={tap(item.href)} aria-current={active ? "page" : undefined} className={`press relative flex h-[64px] flex-col items-center justify-center gap-0.5 text-[0.7812rem] font-semibold ${active ? "text-primary" : "text-ink-2"}`}>
              <span className={`absolute top-0 h-[3px] w-10 rounded-b-full bg-primary transition-all duration-200 ${active ? "opacity-100" : "scale-x-0 opacity-0"}`} />
              <span className={`relative transition-transform duration-200 ${active ? "-translate-y-0.5" : ""}`}>
                {item.icon}
                {item.badge && <Count n={counts[item.badge.key]} urgent={item.badge.urgent} variant="dot" />}
              </span>
              <span>{item.short ?? item.label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setDrawer(true)} className="press flex h-[64px] flex-col items-center justify-center gap-0.5 text-[0.7812rem] font-semibold text-ink-2" aria-label="더보기 메뉴">
          <MoreHorizontal size={20} />
          <span>더보기</span>
        </button>
      </nav>

      <IntroVideo open={intro} onClose={closeIntro} />
      {/* Mobile menu: slides in from the left, under the ☰ button */}
      {drawer && (
        <div className="drawer-backdrop fixed inset-0 z-40 bg-ink/45 lg:hidden" onClick={() => setDrawer(false)} data-testid="drawer">
          <div className="drawer-panel absolute inset-y-0 left-0 flex w-[88%] max-w-[21.25rem] flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="메뉴">
            <div className="flex items-center justify-between bg-shell px-4 pb-4 pt-[calc(16px+env(safe-area-inset-top))] text-white">
              {(() => {
                const me = (
                  <>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-[1.0625rem] font-bold">{user.name.slice(0, 1)}</span>
                    <div className="min-w-0 leading-tight">
                      <div className="truncate text-[1.0625rem] font-bold">{user.name}</div>
                      <div className="break-keep text-[0.875rem] leading-snug text-white/65">{[user.division, user.title ?? ROLE_LABEL[user.role]].filter(Boolean).join(" ")} · {user.orgName}</div>
                    </div>
                  </>
                );
                return <div className="flex min-w-0 items-center gap-3">{me}</div>;
              })()}
              <button type="button" onClick={() => setDrawer(false)} aria-label="닫기" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/80 hover:bg-white/10"><X size={22} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3 pt-3">
              {nav.cta && (
                <Link prefetch={false} href={nav.cta.href} className="mb-1 flex items-center gap-3 rounded-xl bg-primary px-3 text-[1rem] font-bold text-white" style={{ height: 52 }}>
                  <PlusCircle size={20} /> {nav.cta.label}
                </Link>
              )}
              {nav.sections.map((sec) => (
                <div key={sec.title} data-tone={navTone(sec.title)}>
                  <div className="px-3 pb-1 pt-3 text-[0.8125rem] font-semibold text-ink-3">{sec.title}</div>
                  {sec.items.map((item) => (
                    <Link prefetch={false} key={item.href} href={item.href} className={`press flex items-center gap-3 rounded-xl px-3 text-[1.0312rem] font-semibold ${isActive(item) ? "bg-soft text-primary" : "text-ink hover:bg-neutral-bg"}`} style={{ height: 52 }}>
                      <span className={`nav-icon-light ${isActive(item) ? "nav-icon-light-active" : ""}`}>{item.icon}</span>
                      {item.label}
                      {item.badge && <Count n={counts[item.badge.key]} urgent={item.badge.urgent} variant="light" />}
                    </Link>
                  ))}
                </div>
              ))}
              {trainingDays && <div className="mt-3 px-1"><MiniCalendar data={trainingDays} /></div>}
              {!demo && (
                <form action={logout}>
                  <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 text-[1rem] font-semibold text-ink-2 hover:bg-neutral-bg" style={{ height: 52 }}>
                    <span className="nav-icon-light"><LogOut size={20} /></span> 로그아웃
                  </button>
                </form>
              )}
            </div>
            <div className="border-t border-line px-3 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => { setDrawer(false); setIntro(true); }} data-testid="drawer-intro"
                className="press mb-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/30 bg-soft text-[1.0312rem] font-bold text-primary" style={{ height: 52 }}>
                <PlayCircle size={21} /> 서비스 소개 영상 보기
              </button>
              <MadeBy />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 화면을 불러오는 동안 보이는 자리표시: 제목 + 카드 몇 장. */
function PageSkeleton() {
  return (
    <div className="page-skeleton grid gap-4" aria-busy="true" aria-label="불러오는 중" data-testid="page-skeleton">
      <div className="grid gap-2">
        <div className="skeleton h-9 w-56 max-w-full rounded-xl" />
        <div className="skeleton h-5 w-80 max-w-full rounded-lg" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 @4xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
      {[0, 1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
    </div>
  );
}
