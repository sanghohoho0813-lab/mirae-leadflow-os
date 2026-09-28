import Link from "next/link";
import { PlusCircle, Search, List, Map as MapIcon, Lock } from "lucide-react";
import { requireViewer, isManager, canCreateLead, isLeader, usesDb } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { withUser } from "@/lib/db";
import { listLeads, type LeadTab } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { LeadList } from "@/components/leads/LeadRow";
import { LinkButton } from "@/components/ui/Button";
import { LeadMap } from "@/components/leads/LeadMap";

export const dynamic = "force-dynamic";

type Kind = "manager" | "caller" | "consultant" | "leader";
const TABS: { key: LeadTab; label: string; roles: Kind[] }[] = [
  { key: "open", label: "신청 가능", roles: ["manager", "caller", "consultant", "leader"] },
  { key: "mine", label: "내 담당", roles: ["consultant", "leader"] },
  { key: "division", label: "우리 본부 DB", roles: ["leader"] },
  { key: "today", label: "오늘 미팅", roles: ["manager", "caller"] },
  { key: "needs_report", label: "결과 미입력", roles: ["manager", "caller"] },
  { key: "draft", label: "공개 대기", roles: ["manager", "caller", "leader"] },
  { key: "follow_up", label: "후속 진행", roles: ["manager", "caller", "consultant"] },
  { key: "all", label: "전체", roles: ["manager", "caller", "consultant"] },
  { key: "closed", label: "종료·취소", roles: ["manager", "caller", "consultant", "leader"] },
];

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; view?: string }> }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  if (!usesDb(viewer)) redirect("/");
  const kind: Kind = isManager(viewer) ? "manager" : viewer.profile.role === "CALLER" ? "caller" : isLeader(viewer) ? "leader" : "consultant";
  const claimer = kind === "consultant" || kind === "leader";
  const tabs = TABS.filter((t) => t.roles.includes(kind));
  const defaultTab: LeadTab = claimer ? "open" : "all";
  const tab = (tabs.some((t) => t.key === sp.tab) ? sp.tab : defaultTab) as LeadTab;
  const q = sp.q ?? "";
  const view = sp.view === "map" ? "map" : "list";
  const qs = (next: { tab?: string; view?: string }) => {
    const p = new URLSearchParams();
    p.set("tab", next.tab ?? tab);
    if (q) p.set("q", q);
    if ((next.view ?? view) === "map") p.set("view", "map");
    return `/leads?${p}`;
  };
  const limit = viewer.organization.claim_limit;
  const [leads, active] = await withUser(viewer.session.userId, (tx) => Promise.all([
    listLeads(tx, { tab, userId: viewer.session.userId, q }),
    claimer && tab === "open"
      ? tx<{ n: number }[]>`select count(*)::int as n from leads where assigned_to = ${viewer.session.userId} and status = 'ASSIGNED' and meeting_round = 1`.then((r) => r[0].n)
      : Promise.resolve(0),
  ]));
  const claimable = claimer && tab === "open" && !(limit > 0 && active >= limit);

  const titles: Record<LeadTab, string> = {
    open: "신청 가능한 DB", mine: "내 담당 미팅", division: `${viewer.division?.name ?? "우리 본부"} DB`, today: "오늘 미팅", needs_report: "결과 미입력 DB", draft: "공개 대기 DB", follow_up: "후속 진행 중", all: "전체 DB", closed: "종료·취소된 DB",
  };
  const help: Partial<Record<LeadTab, string>> = {
    open: claimer
      ? `원하는 DB를 눌러 [이 미팅 신청하기]를 누르면 선착순으로 담당이 확정됩니다.${viewer.organization.claim_limit ? ` 한 사람당 ${viewer.organization.claim_limit}건씩, 결과를 입력하면 다음 DB를 신청할 수 있습니다.` : ""}`
      : "컨설턴트가 선착순으로 신청할 수 있는 상태입니다.",
    needs_report: "미팅 시간이 지났지만 결과가 입력되지 않은 DB입니다.",
    draft: kind === "leader" ? "본부에서 등록했고 아직 본부원에게 공개하지 않은 DB입니다." : "콜팀이 등록했고 아직 컨설턴트에게 공개되지 않은 DB입니다.",
    division: "본부장님이 등록한 본부 전용 DB입니다. 단장·비서와 우리 본부 사람만 봅니다. 콜팀에게는 보이지 않습니다.",
  };

  return (
    <div className="fade-up">
      <PageHeader
        title={titles[tab]}
        sub={help[tab]}
        action={canCreateLead(viewer) ? <LinkButton href="/leads/new"><PlusCircle size={19} /> 신규 DB 등록</LinkButton> : undefined}
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0" role="tablist">
          {tabs.map((t) => (
            <Link prefetch={false}
              key={t.key}
              href={qs({ tab: t.key })}
              role="tab"
              aria-selected={t.key === tab}
              className={`press flex h-11 shrink-0 items-center rounded-xl border px-4 text-[0.9688rem] font-semibold ${t.key === tab ? "border-primary bg-primary text-white" : "border-line bg-white text-ink-2 hover:border-primary/40"}`}
              data-testid={`tab-${t.key}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <form className="relative lg:w-80" action="/leads">
          <input type="hidden" name="tab" value={tab} />
          {view === "map" && <input type="hidden" name="view" value="map" />}
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <input name="q" defaultValue={q} placeholder="회사명, 지역, 담당자 검색" className="h-12 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-[1rem] outline-none transition-base focus:border-primary focus:ring-4 focus:ring-primary/15" />
        </form>
      </div>

      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[0.9375rem] font-semibold text-ink-3">{leads.length}건</p>
        <div className="inline-flex rounded-xl border border-line bg-white p-1" role="tablist" aria-label="보기 방식">
          {([["list", "목록", <List key="l" size={17} />], ["map", "지도", <MapIcon key="m" size={17} />]] as const).map(([v, label, icon]) => (
            <Link prefetch={false} key={v} href={qs({ view: v })} role="tab" aria-selected={view === v} data-testid={`view-${v}`}
              className={`press flex h-10 items-center gap-1.5 rounded-lg px-3.5 text-[0.9375rem] font-semibold ${view === v ? "bg-primary text-white" : "text-ink-2 hover:bg-neutral-bg"}`}>
              {icon}{label}
            </Link>
          ))}
        </div>
      </div>
      {view === "map" ? (
        <LeadMap leads={leads.map((l) => ({ id: l.id, company_name: l.company_name, region: l.region, status: l.status, needs_report: l.needs_report, meeting_at: l.meeting_at, assignee_name: l.assignee_name }))} />
      ) : (
        <>
          {claimer && tab === "open" && !claimable && limit > 0 && leads.length > 0 && (
            <p className="mb-3 flex gap-2.5 rounded-xl border border-line bg-canvas px-4 py-3 text-[0.96875rem] text-ink-2" data-testid="claim-limit-note">
              <Lock size={19} className="mt-0.5 shrink-0 text-ink-3" />
              <span>진행 중인 미팅이 있어 지금은 새로 신청할 수 없습니다. <Link prefetch={false} href="/leads?tab=mine" className="font-semibold text-primary underline-offset-2 hover:underline">내 미팅</Link>에서 결과를 입력하면 바로 신청할 수 있습니다.</span>
            </p>
          )}
          <LeadList leads={leads} emptyText={q ? `"${q}"에 해당하는 DB가 없습니다.` : "해당하는 DB가 없습니다."} showAssignee={!claimer || tab !== "mine"} claimable={claimable} />
        </>
      )}
    </div>
  );
}
