import Link from "next/link";
import { Database, Clock, CalendarCheck, AlertCircle, RefreshCw, Inbox, AlarmClock, PlusCircle, ChevronRight, Sparkles } from "lucide-react";
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
import { fmtDate, weekdayKo } from "@/lib/time";

export const dynamic = "force-dynamic";

function Greeting({ name, role }: { name: string; role: string }) {
  const now = new Date();
  return (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[15px] font-semibold text-ink-3">{fmtDate(now)} ({weekdayKo(now)})</p>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink sm:text-[30px]">
          {name} {role}님, <span className="text-primary">오늘 할 일</span>입니다.
        </h1>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const viewer = await requireViewer();
  const uid = viewer.session.userId;
  const roleLabel = { OWNER: "단장", MANAGER: "운영담당", CALLER: "콜담당", LEADER: "본부장", CONSULTANT: "컨설턴트" }[viewer.profile.role];

  if (isManager(viewer)) {
    const d = await withUser(uid, (tx) => getManagerDashboard(tx, uid));
    const c = d.counts;
    return (
      <div className="fade-up">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Greeting name={viewer.profile.full_name} role={roleLabel} />
          <LinkButton href="/leads/new" size="lg" className="sm:mb-5"><PlusCircle size={20} /> 신규 DB 등록</LinkButton>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 @2xl:grid-cols-3 @5xl:grid-cols-6">
          <KpiTile label="결과 미입력" value={c.needs_report} tone="danger" icon={<AlertCircle size={19} />} href="/leads?tab=needs_report" emphasis testId="kpi-needs-report" />
          <KpiTile label="장기 미처리" value={c.long_overdue} tone="warning" icon={<AlarmClock size={19} />} href="/leads?tab=needs_report" sub="3일↑ 미보고·7일↑ 후속" />
          <KpiTile label="오늘 미팅" value={c.today_meetings} tone="info" icon={<CalendarCheck size={19} />} href="/leads?tab=today" />
          <KpiTile label="후속조치 예정" value={c.follow_ups_due} tone="purple" icon={<RefreshCw size={19} />} href="/follow-ups?scope=all" sub="오늘까지" />
          <KpiTile label="공개 대기" value={c.draft} tone="neutral" icon={<Inbox size={19} />} href="/leads?tab=draft" />
          <KpiTile label="신청 가능" value={c.open} tone="warning" icon={<Database size={19} />} href="/leads?tab=open" sub={`오늘 등록 ${c.new_today}건`} />
        </div>

        <div className="grid gap-4 @4xl:grid-cols-2">
          <Card className="fade-up-2 @4xl:col-span-2" tone={d.needsReport.length ? "danger" : "white"}>
            <CardHeader icon={<AlertCircle size={20} />} title="미팅은 지났는데 결과가 없는 DB" count={d.needsReport.length} href="/leads?tab=needs_report" />
            <CardBody>
              {d.needsReport.length ? (
                <>
                  <p className="mb-3 text-[15px] text-ink-2">담당자를 눌러 확인하거나, 상세에서 대신 결과를 입력할 수 있습니다.</p>
                  <LeadList leads={d.needsReport} emptyText="" />
                </>
              ) : (
                <Empty title="모든 미팅 결과가 입력되었습니다" desc="더 이상 개별 카톡으로 확인할 필요가 없습니다." />
              )}
            </CardBody>
          </Card>

          <Card className="fade-up-2">
            <CardHeader icon={<CalendarCheck size={20} />} title="오늘의 미팅" count={d.todayMeetings.length} href="/leads?tab=today" />
            <CardBody><LeadList leads={d.todayMeetings} emptyText="오늘 예정된 미팅이 없습니다." /></CardBody>
          </Card>

          <Card className="fade-up-3">
            <CardHeader icon={<Inbox size={20} />} title="공개 대기 DB" count={d.drafts.length} href="/leads?tab=draft" />
            <CardBody>
              {d.drafts.length ? (
                <div className="grid gap-2">
                  {d.drafts.map((l) => (
                    <div key={l.id} className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3">
                      <Link href={`/leads/${l.id}`} className="min-w-0 flex-1">
                        <div className="truncate text-[17px] font-bold text-ink hover:text-primary">{l.company_name}</div>
                        <div className="text-[14.5px] text-ink-2">{l.region} · {fmtDate(l.meeting_at)} · 등록 {l.creator_name}</div>
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

          <Card className="fade-up-3 @4xl:col-span-2">
            <CardHeader icon={<RefreshCw size={20} />} title="오늘까지 처리할 후속조치" count={d.followUpsDue.length} href="/follow-ups?scope=all" />
            <CardBody><FollowUpList items={d.followUpsDue} emptyText="오늘까지 예정된 후속조치가 없습니다." canComplete={true} showAssignee /></CardBody>
          </Card>
        </div>
      </div>
    );
  }

  if (viewer.profile.role === "CALLER") {
    const d = await withUser(uid, (tx) => getCallerDashboard(tx, uid));
    return (
      <div className="fade-up">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Greeting name={viewer.profile.full_name} role={roleLabel} />
          <LinkButton href="/leads/new" size="lg" className="sm:mb-5"><PlusCircle size={20} /> 신규 DB 등록</LinkButton>
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
          <Card className="fade-up-3 @4xl:col-span-2">
            <CardHeader icon={<CalendarCheck size={20} />} title="내가 등록한 예정 미팅" count={d.upcoming.length} href="/leads?tab=all" />
            <CardBody><LeadList leads={d.upcoming} emptyText="예정된 미팅이 없습니다." /></CardBody>
          </Card>
        </div>
      </div>
    );
  }

  // CONSULTANT / LEADER
  const d = await withUser(uid, (tx) => getConsultantDashboard(tx, uid));
  const c = d.counts;
  const firstTodo = d.needsReport[0] ?? d.today[0] ?? null;
  return (
    <div className="fade-up">
      <Greeting name={viewer.profile.full_name} role={roleLabel} />

      <div className="mb-6 grid grid-cols-2 gap-3 @3xl:grid-cols-4">
        <KpiTile label="오늘 미팅" value={c.today} tone="info" icon={<CalendarCheck size={19} />} href="/leads?tab=mine" />
        <KpiTile label="결과 미입력" value={c.needs_report} tone="danger" icon={<AlertCircle size={19} />} href="/leads?tab=mine" emphasis testId="kpi-needs-report" />
        <KpiTile label="후속 연락" value={c.follow_ups_due} tone="purple" icon={<RefreshCw size={19} />} href="/follow-ups" sub="오늘까지" />
        <KpiTile label="신청 가능 DB" value={c.open} tone="warning" icon={<Sparkles size={19} />} href="/leads?tab=open" sub="선착순" />
      </div>

      {firstTodo && (
        <Link href={firstTodo.needs_report ? `/leads/${firstTodo.id}/report` : `/leads/${firstTodo.id}`} className="fade-up-2 mb-4 flex items-center gap-3 rounded-2xl bg-primary px-5 py-4 text-white shadow-card transition-base hover:bg-primary-strong" data-testid="first-todo">
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold opacity-85">{firstTodo.needs_report ? "지금 바로 결과를 입력해 주세요" : "다음 미팅"}</div>
            <div className="truncate text-[20px] font-extrabold">{firstTodo.company_name} · {firstTodo.region}</div>
          </div>
          <ChevronRight size={24} />
        </Link>
      )}

      <div className="grid gap-4 @4xl:grid-cols-2">
        {d.needsReport.length > 0 && (
          <Card className="fade-up-2 @4xl:col-span-2" tone="danger">
            <CardHeader icon={<AlertCircle size={20} />} title="결과 입력이 필요한 미팅" count={d.needsReport.length} />
            <CardBody>
              <p className="mb-3 text-[15px] text-ink-2">클릭 몇 번이면 끝납니다. 단장님이 따로 묻지 않아도 됩니다.</p>
              <LeadList leads={d.needsReport} emptyText="" showAssignee={false} />
            </CardBody>
          </Card>
        )}
        <Card className="fade-up-2">
          <CardHeader icon={<CalendarCheck size={20} />} title="오늘 미팅" count={d.today.length} />
          <CardBody><LeadList leads={d.today} emptyText="오늘 예정된 미팅이 없습니다." showAssignee={false} /></CardBody>
        </Card>
        <Card className="fade-up-2">
          <CardHeader icon={<RefreshCw size={20} />} title="오늘까지 후속 연락" count={d.followUpsDue.length} href="/follow-ups" />
          <CardBody><FollowUpList items={d.followUpsDue} emptyText="오늘까지 예정된 후속 연락이 없습니다." canComplete /></CardBody>
        </Card>
        <Card className="fade-up-3">
          <CardHeader icon={<Clock size={20} />} title="예정된 미팅" count={c.upcoming} href="/leads?tab=mine" />
          <CardBody><LeadList leads={d.upcoming} emptyText="예정된 미팅이 없습니다. 신청 가능한 DB를 확인해 보세요." showAssignee={false} /></CardBody>
        </Card>
        <Card className="fade-up-3" tone="soft">
          <CardHeader icon={<Sparkles size={20} />} title="신청 가능한 DB" count={c.open} href="/leads?tab=open" hrefLabel="모두 보기" />
          <CardBody>
            <LeadList leads={d.open} emptyText="지금은 신청 가능한 DB가 없습니다. 단장님이 공개하면 여기에 나타납니다." showAssignee={false} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
