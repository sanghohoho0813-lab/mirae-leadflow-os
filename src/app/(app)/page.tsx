import Link from "next/link";
import { Map as MapIcon } from "lucide-react";
import { Database, Clock, CalendarCheck, AlertCircle, RefreshCw, Inbox, PlusCircle, ChevronRight, Sparkles, Lock } from "lucide-react";
import { requireViewer, isManager } from "@/lib/auth/session";
import { withUser } from "@/lib/db";
import { getCallerDashboard, getConsultantDashboard, getManagerDashboard } from "@/lib/queries";
import { KpiTile } from "@/components/ui/KpiTile";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LeadList } from "@/components/leads/LeadRow";
import { FollowUpList } from "@/components/leads/FollowUpCard";
import { Empty } from "@/components/ui/Empty";
import { LinkButton } from "@/components/ui/Button";
import { PublishButton } from "@/components/leads/LeadActions";
import { fmtDate } from "@/lib/time";
import { honorific } from "@/lib/labels";
import { getTrainingHighlights } from "@/lib/trainings";
import { TrainingHomeCard } from "@/components/trainings/TrainingHomeCard";

export const dynamic = "force-dynamic";

function Greeting({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-[1.625rem] font-extrabold tracking-tight text-ink sm:text-[1.875rem]">
        {text}, <span className="text-primary">오늘 할 일</span>입니다.
      </h1>
      {sub && <p className="mt-1 text-[1rem] text-ink-2">{sub}</p>}
    </div>
  );
}

export default async function HomePage() {
  const viewer = await requireViewer();
  const uid = viewer.session.userId;
  const hello = honorific(viewer.profile.full_name, viewer.profile.role, viewer.profile.title);

  if (isManager(viewer)) {
    const [d, h] = await withUser(uid, (tx) => Promise.all([getManagerDashboard(tx, uid), getTrainingHighlights(tx, uid)]));
    const c = d.counts;
    return (
      <div className="fade-up">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <Greeting text={hello} />
          <LinkButton href="/leads/new" size="lg" className="mb-5"><PlusCircle size={20} /> 신규 DB 등록</LinkButton>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 @4xl:grid-cols-4">
          <KpiTile label="결과 미입력" value={c.needs_report} tone="danger" icon={<AlertCircle size={19} />} href="/leads?tab=needs_report" emphasis testId="kpi-needs-report" sub={c.long_overdue ? `오래된 건 ${c.long_overdue}` : "미팅 후 보고 대기"} />
          <KpiTile label="오늘 미팅" value={c.today_meetings} tone="info" icon={<CalendarCheck size={19} />} href="/leads?tab=today" />
          <KpiTile label="공개 대기" value={c.draft} tone="neutral" icon={<Inbox size={19} />} href="/leads?tab=draft" sub="공개하면 신청 시작" />
          <KpiTile label="신청 가능" value={c.open} tone="warning" icon={<Database size={19} />} href="/leads?tab=open" sub={`오늘 등록 ${c.new_today}건`} />
        </div>

        <div className="grid gap-4 @4xl:grid-cols-2">
          <Card className="fade-up-2 @4xl:col-span-2" tone={d.needsReport.length ? "danger" : "white"}>
            <CardHeader icon={<AlertCircle size={20} />} title="미팅은 지났는데 결과가 없는 DB" count={d.needsReport.length} href="/leads?tab=needs_report" />
            <CardBody>
              {d.needsReport.length ? (
                <>
                  <p className="mb-3 text-[0.9375rem] text-ink-2">담당자는 결과를 입력해야 다음 DB를 신청할 수 있습니다. 상세에서 대신 입력할 수도 있습니다.</p>
                  <LeadList leads={d.needsReport} emptyText="" />
                </>
              ) : (
                <Empty title="모든 미팅 결과가 입력되었습니다" desc="더 이상 개별 카톡으로 확인할 필요가 없습니다." />
              )}
            </CardBody>
          </Card>

          <Card className="fade-up-2">
            <CardHeader icon={<CalendarCheck size={20} />} title="오늘의 미팅" count={d.todayMeetings.length} right={<MapLink href="/leads?tab=today&view=map" />} href="/leads?tab=today" />
            <CardBody><LeadList leads={d.todayMeetings} emptyText="오늘 예정된 미팅이 없습니다." /></CardBody>
          </Card>

          <TrainingHomeCard h={h} showReads className="fade-up-2" />

          <Card className="fade-up-3">
            <CardHeader icon={<Inbox size={20} />} title="공개 대기 DB" count={d.drafts.length} href="/leads?tab=draft" />
            <CardBody>
              {d.drafts.length ? (
                <div className="grid gap-2">
                  {d.drafts.map((l) => (
                    <div key={l.id} className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3">
                      <Link prefetch={false} href={`/leads/${l.id}`} className="min-w-0 flex-1">
                        <div className="truncate text-[1.0625rem] font-bold text-ink hover:text-primary">{l.company_name}</div>
                        <div className="text-[0.9062rem] text-ink-2">{l.region} · {fmtDate(l.meeting_at)} · 등록 {l.creator_name}</div>
                      </Link>
                      <PublishButton id={l.id} size="sm" />
                    </div>
                  ))}
                </div>
              ) : (
                <Empty title="공개를 기다리는 DB가 없습니다" tone="neutral" icon={<Inbox size={28} />} action={<LinkButton href="/leads/new" variant="secondary" size="sm">신규 DB 등록</LinkButton>} />
              )}
            </CardBody>
          </Card>

          <Card className="fade-up-3">
            <CardHeader icon={<RefreshCw size={20} />} title="오늘까지 처리할 후속조치" count={d.followUpsDue.length} href="/follow-ups?scope=all" />
            <CardBody><FollowUpList items={d.followUpsDue} emptyText="오늘까지 예정된 후속조치가 없습니다." canComplete={true} showAssignee /></CardBody>
          </Card>
        </div>
      </div>
    );
  }

  if (viewer.profile.role === "CALLER") {
    const [d, h] = await withUser(uid, (tx) => Promise.all([getCallerDashboard(tx, uid), getTrainingHighlights(tx, uid)]));
    return (
      <div className="fade-up">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <Greeting text={hello} />
          <LinkButton href="/leads/new" size="lg" className="mb-5"><PlusCircle size={20} /> 신규 DB 등록</LinkButton>
        </div>
        <div className="mb-6 grid grid-cols-2 gap-3 @3xl:grid-cols-4">
          <KpiTile label="오늘 등록" value={d.counts.registered_today} tone="info" icon={<Database size={19} />} href="/leads?tab=all" />
          <KpiTile label="공개 대기" value={d.counts.draft} tone="neutral" icon={<Inbox size={19} />} href="/leads?tab=draft" sub="단장 공개 전" />
          <KpiTile label="신청 가능" value={d.counts.open} tone="warning" icon={<Sparkles size={19} />} href="/leads?tab=open" />
          <KpiTile label="예약된 미팅" value={d.counts.upcoming} tone="success" icon={<CalendarCheck size={19} />} href="/leads?tab=all" sub="내가 등록한 건" />
        </div>
        <div className="grid gap-4 @4xl:grid-cols-2">
          <Card className="fade-up-2">
            <CardHeader icon={<Database size={20} />} title="오늘 등록한 DB" count={d.registeredToday.length} />
            <CardBody>
              <LeadList leads={d.registeredToday} emptyText="오늘 등록한 DB가 없습니다. 미팅이 잡히면 바로 등록해 주세요." />
            </CardBody>
          </Card>
          <Card className="fade-up-2">
            <CardHeader icon={<Inbox size={20} />} title="공개 대기 중" count={d.myDrafts.length} href="/leads?tab=draft" />
            <CardBody><LeadList leads={d.myDrafts} emptyText="공개를 기다리는 DB가 없습니다." /></CardBody>
          </Card>
          <Card className="fade-up-3">
            <CardHeader icon={<CalendarCheck size={20} />} title="내가 등록한 예정 미팅" count={d.upcoming.length} href="/leads?tab=all" />
            <CardBody><LeadList leads={d.upcoming} emptyText="예정된 미팅이 없습니다." /></CardBody>
          </Card>
          <TrainingHomeCard h={h} className="fade-up-3" />
        </div>
      </div>
    );
  }

  // CONSULTANT / LEADER — 신청 가능한 DB first, then my meetings, then 교육.
  const [d, h] = await withUser(uid, (tx) => Promise.all([getConsultantDashboard(tx, uid), getTrainingHighlights(tx, uid)]));
  const c = d.counts;
  const limit = viewer.organization.claim_limit;
  const active = c.needs_report + c.upcoming; // every ASSIGNED meeting without a result
  const blocked = limit > 0 && active >= limit;
  const blocker = d.needsReport[0] ?? d.today[0] ?? d.upcoming[0] ?? null;
  const myMeetings = [...d.today.filter((l) => !l.needs_report), ...d.upcoming];
  return (
    <div className="fade-up">
      <Greeting text={hello} />

      {d.needsReport.length > 0 && (
        <Link prefetch={false} href={`/leads/${d.needsReport[0].id}/report`} className="fade-up-2 mb-4 flex items-center gap-3 rounded-2xl border border-danger/40 bg-danger-bg px-5 py-4 transition-base hover:border-danger" data-testid="first-todo">
          <AlertCircle size={26} className="shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <div className="text-[0.9375rem] font-semibold text-danger">결과 입력이 필요한 미팅 {d.needsReport.length}건 · 입력해야 다음 DB를 신청할 수 있어요</div>
            <div className="truncate text-[1.25rem] font-extrabold text-ink">{d.needsReport[0].company_name} · {d.needsReport[0].region}</div>
          </div>
          <span className="hidden shrink-0 rounded-xl bg-danger px-4 py-2.5 text-[1rem] font-bold text-white sm:inline">결과 입력</span>
          <ChevronRight size={24} className="shrink-0 text-danger sm:hidden" />
        </Link>
      )}

      <Card className="fade-up-2 mb-4" testId="home-open">
        <CardHeader icon={<Sparkles size={20} />} title="신청 가능한 DB" count={c.open} right={<MapLink href="/leads?tab=open&view=map" />} href="/leads?tab=open" hrefLabel="모두 보기" />
        <CardBody>
          {blocked && c.open > 0 && blocker && (
            <div className="mb-3 flex gap-2.5 rounded-xl border border-line bg-canvas px-4 py-3 text-[0.9688rem] text-ink-2" data-testid="claim-limit-note">
              <Lock size={19} className="mt-0.5 shrink-0 text-ink-3" />
              <span>진행 중인 미팅 <b className="text-ink">{blocker.company_name}</b>이(가) 있어 지금은 새로 신청할 수 없습니다. {limit === 1 ? "한 사람당 한 건씩" : `한 사람당 ${limit}건까지`} 진행하며, 결과를 입력하면 바로 신청할 수 있습니다.</span>
            </div>
          )}
          <LeadList leads={d.open} emptyText="지금은 신청 가능한 DB가 없습니다. 단장님이 공개하면 여기에 나타납니다." showAssignee={false} claimable={!blocked} />
        </CardBody>
      </Card>

      <div className="grid gap-4 @4xl:grid-cols-2">
        <Card className="fade-up-2">
          <CardHeader icon={<CalendarCheck size={20} />} title="내 미팅" count={myMeetings.length} href="/leads?tab=mine" />
          <CardBody><LeadList leads={myMeetings} emptyText="예정된 미팅이 없습니다. 위에서 DB를 신청해 보세요." showAssignee={false} /></CardBody>
        </Card>
        <TrainingHomeCard h={h} className="fade-up-2" />
        <Card className="fade-up-3 @4xl:col-span-2">
          <CardHeader icon={<RefreshCw size={20} />} title="오늘까지 후속 연락" count={d.followUpsDue.length} href="/follow-ups" />
          <CardBody><FollowUpList items={d.followUpsDue} emptyText="오늘까지 예정된 후속 연락이 없습니다." canComplete /></CardBody>
        </Card>
      </div>
    </div>
  );
}

function MapLink({ href }: { href: string }) {
  return (
    <Link prefetch={false} href={href} className="press inline-flex h-9 items-center gap-1 rounded-lg border border-line px-2.5 text-[0.875rem] font-semibold text-ink-2 hover:border-primary/40 hover:text-primary">
      <MapIcon size={15} /> 지도
    </Link>
  );
}
