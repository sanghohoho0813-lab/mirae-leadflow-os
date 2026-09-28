import Link from "next/link";
import { PlusCircle, Search, List, Map as MapIcon } from "lucide-react";
import { requireViewer, isManager, canCreateLead } from "@/lib/auth/session";
import { withUser } from "@/lib/db";
import { listLeads, type LeadTab } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { LeadList } from "@/components/leads/LeadRow";
import { LinkButton } from "@/components/ui/Button";
import { LeadMap } from "@/components/leads/LeadMap";

export const dynamic = "force-dynamic";

const TABS: { key: LeadTab; label: string; roles: ("manager" | "caller" | "consultant")[] }[] = [
  { key: "open", label: "신청 가능", roles: ["manager", "caller", "consultant"] },
  { key: "mine", label: "내 담당", roles: ["consultant"] },
  { key: "today", label: "오늘 미팅", roles: ["manager", "caller"] },
  { key: "needs_report", label: "결과 미입력", roles: ["manager", "caller"] },
  { key: "draft", label: "공개 대기", roles: ["manager", "caller"] },
  { key: "follow_up", label: "후속 진행", roles: ["manager", "caller", "consultant"] },
  { key: "all", label: "전체", roles: ["manager", "caller", "consultant"] },
  { key: "closed", label: "종료·취소", roles: ["manager", "caller", "consultant"] },
];

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; view?: string }> }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const kind = isManager(viewer) ? "manager" : viewer.profile.role === "CALLER" ? "caller" : "consultant";
  const tabs = TABS.filter((t) => t.roles.includes(kind));
  const defaultTab: LeadTab = kind === "consultant" ? "open" : "all";
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
  const leads = await withUser(viewer.session.userId, (tx) => listLeads(tx, { tab, userId: viewer.session.userId, q }));

  const titles: Record<LeadTab, string> = {
    open: "신청 가능한 DB", mine: "내 담당 미팅", today: "오늘 미팅", needs_report: "결과 미입력 DB", draft: "공개 대기 DB", follow_up: "후속 진행 중", all: "전체 DB", closed: "종료·취소된 DB",
  };
  const help: Partial<Record<LeadTab, string>> = {
    open: kind === "consultant" ? "원하는 DB를 눌러 [이 미팅 신청하기]를 누르면 선착순으로 담당이 확정됩니다." : "컨설턴트가 선착순으로 신청할 수 있는 상태입니다.",
    needs_report: "미팅 시간이 지났지만 결과가 입력되지 않은 DB입니다.",
    draft: "콜 담당이 등록했고 아직 컨설턴트에게 공개되지 않은 DB입니다.",
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
              className={`press flex h-11 shrink-0 items-center rounded-xl border px-4 text-[15.5px] font-semibold ${t.key === tab ? "border-primary bg-primary text-white" : "border-line bg-white text-ink-2 hover:border-primary/40"}`}
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
          <input name="q" defaultValue={q} placeholder="회사명, 지역, 담당자 검색" className="h-12 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-[16px] outline-none transition-base focus:border-primary focus:ring-4 focus:ring-primary/15" />
        </form>
      </div>

      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[15px] font-semibold text-ink-3">{leads.length}건</p>
        <div className="inline-flex rounded-xl border border-line bg-white p-1" role="tablist" aria-label="보기 방식">
          {([["list", "목록", <List key="l" size={17} />], ["map", "지도", <MapIcon key="m" size={17} />]] as const).map(([v, label, icon]) => (
            <Link prefetch={false} key={v} href={qs({ view: v })} role="tab" aria-selected={view === v} data-testid={`view-${v}`}
              className={`press flex h-10 items-center gap-1.5 rounded-lg px-3.5 text-[15px] font-semibold ${view === v ? "bg-primary text-white" : "text-ink-2 hover:bg-neutral-bg"}`}>
              {icon}{label}
            </Link>
          ))}
        </div>
      </div>
      {view === "map" ? (
        <LeadMap leads={leads.map((l) => ({ id: l.id, company_name: l.company_name, region: l.region, status: l.status, needs_report: l.needs_report, meeting_at: l.meeting_at, assignee_name: l.assignee_name }))} />
      ) : (
        <LeadList leads={leads} emptyText={q ? `"${q}"에 해당하는 DB가 없습니다.` : "해당하는 DB가 없습니다."} showAssignee={kind !== "consultant" || tab !== "mine"} />
      )}
    </div>
  );
}
