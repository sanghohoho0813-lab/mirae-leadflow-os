import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MapPin, Clock, Building2, User, Lock, Phone, FileText, MessageSquare, History, ClipboardList, Users, AlertTriangle, Sparkles, ThumbsDown } from "lucide-react";
import { requireViewer, isManager } from "@/lib/auth/session";
import { withUser } from "@/lib/db";
import { getLead, getLeadAssignments, getLeadFollowUps, getLeadLogs, getLeadPrivate, getLeadReports, listConsultants } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, Badge, Tag } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LeadActionBar } from "@/components/leads/LeadActions";
import { FollowUpList } from "@/components/leads/FollowUpCard";
import { MethodIcon } from "@/components/leads/LeadRow";
import { QueryToast } from "@/components/leads/QueryToast";
import { ActivityTimeline } from "@/components/leads/ActivityTimeline";
import { METHOD_LABEL, OUTCOME_LABEL, REACTION_LABEL, RESULT_LABEL, NEXT_ACTION_LABEL } from "@/lib/labels";
import { fmtDateTime, fmtDate, relativeDay, daysSince, fmtRelativeTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lost?: string }> }) {
  const { id } = await params;
  const { lost } = await searchParams;
  const viewer = await requireViewer();
  const uid = viewer.session.userId;
  const manager = isManager(viewer);

  const data = await withUser(uid, async (tx) => {
    const lead = await getLead(tx, id);
    if (!lead) return null;
    const [priv, reports, followUps, assignments, logs, consultants] = await Promise.all([
      getLeadPrivate(tx, id), getLeadReports(tx, id), getLeadFollowUps(tx, id), getLeadAssignments(tx, id), getLeadLogs(tx, id),
      manager ? listConsultants(tx) : Promise.resolve([]),
    ]);
    return { lead, priv, reports, followUps, assignments, logs, consultants };
  });
  if (!data) notFound();
  const { lead, priv, reports, followUps, assignments, logs, consultants } = data;
  const rel = relativeDay(lead.meeting_at);
  const mine = lead.assigned_to === uid;
  const consultantRole = viewer.profile.role === "CONSULTANT" || viewer.profile.role === "LEADER";

  return (
    <div className="fade-up">
      <Suspense><QueryToast /></Suspense>
      <PageHeader
        back={consultantRole ? (lead.status === "OPEN" ? "/leads?tab=open" : "/leads?tab=mine") : "/leads"}
        backLabel="목록"
        eyebrow={<div className="flex flex-wrap items-center gap-2"><StatusBadge status={lead.status} needsReport={lead.needs_report} size="lg" />{lead.needs_report && daysSince(lead.meeting_at) >= 1 && <Badge tone="danger" size="lg">{daysSince(lead.meeting_at)}일 경과</Badge>}{mine && <Badge tone="info" size="lg">내 담당</Badge>}</div>}
        title={lead.company_name}
        sub={<span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">{lead.industry && <span className="inline-flex items-center gap-1"><Building2 size={15} /> {lead.industry}</span>}<span className="inline-flex items-center gap-1"><MapPin size={15} /> {lead.region}</span></span>}
      />

      <div className="grid gap-4 @4xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-4">
          {/* Meeting summary + actions */}
          <Card className="fade-up">
            <CardBody className="pt-5">
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div className={`rounded-xl px-4 py-3 ${rel.diff === 0 ? "bg-soft" : lead.needs_report ? "bg-danger-bg" : "bg-neutral-bg"}`}>
                  <div className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-2"><Clock size={15} /> 미팅 일시</div>
                  <div className="mt-0.5 text-[19px] font-extrabold text-ink" data-testid="meeting-at">{fmtDateTime(lead.meeting_at)}</div>
                  <div className={`text-[14px] font-semibold ${rel.diff === 0 ? "text-primary" : lead.needs_report ? "text-danger" : "text-ink-3"}`}>{rel.label}</div>
                </div>
                <div className="rounded-xl bg-neutral-bg px-4 py-3">
                  <div className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-2"><MethodIcon method={lead.meeting_method} /> 미팅 방식</div>
                  <div className="mt-0.5 text-[19px] font-extrabold text-ink">{METHOD_LABEL[lead.meeting_method]}</div>
                </div>
                <div className="rounded-xl bg-neutral-bg px-4 py-3">
                  <div className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-2"><User size={15} /> 담당 컨설턴트</div>
                  <div className="mt-0.5 text-[19px] font-extrabold text-ink" data-testid="assignee">{lead.assignee_name ?? (lead.status === "OPEN" ? "신청 가능" : "미정")}</div>
                  {lead.assigned_at && <div className="text-[14px] text-ink-3">{fmtDate(lead.assigned_at)} 확정</div>}
                </div>
              </div>
              {lead.public_summary && <p className="mb-4 rounded-xl border border-line bg-white px-4 py-3 text-[17px] text-ink">{lead.public_summary}</p>}
              {lost === "1" && !mine && lead.status === "ASSIGNED" && (
                <div className="mb-4 rounded-2xl border border-warning/40 bg-warning-bg px-4 py-4 text-[16px] font-semibold text-warning" data-testid="claim-lost">
                  아쉽지만 다른 컨설턴트가 먼저 신청했습니다. 다음 DB를 확인해 보세요.
                  <div className="mt-2"><Link href="/leads?tab=open" className="inline-flex h-10 items-center rounded-xl border border-warning/40 bg-white px-4 text-[15px] font-semibold text-warning">신청 가능한 DB 보기</Link></div>
                </div>
              )}
              <LeadActionBar lead={lead} role={viewer.profile.role} userId={uid} consultants={consultants.map((c) => ({ id: c.id, full_name: c.full_name }))} phone={priv?.contact_phone ?? null} />
            </CardBody>
          </Card>

          {/* Private details */}
          {priv ? (
            <Card className="fade-up-2" testId="private-details">
              <CardHeader icon={<FileText size={20} />} title="담당자 · 콜 메모" right={<Badge tone="info">담당자·운영진만 열람</Badge>} />
              <CardBody className="grid gap-4">
                <div className="grid gap-2 sm:grid-cols-3">
                  <Info label="미팅 상대" value={[priv.contact_name, priv.contact_title].filter(Boolean).join(" ") || "-"} />
                  <Info label="연락처" value={priv.contact_phone ? <a href={`tel:${priv.contact_phone.replace(/[^0-9+]/g, "")}`} className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"><Phone size={16} />{priv.contact_phone}</a> : "-"} testId="contact-phone" />
                  <Info label="통화 주제" value={priv.call_topic || "-"} />
                </div>
                {(priv.interest_tags.length > 0 || priv.concern_tags.length > 0) && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <div className="mb-1 flex items-center gap-1 text-[14.5px] font-semibold text-ink-2"><Sparkles size={15} className="text-success" /> 관심 보인 부분</div>
                      <div className="flex flex-wrap gap-1.5">{priv.interest_tags.length ? priv.interest_tags.map((t) => <Tag key={t} tone="success">{t}</Tag>) : <span className="text-[15px] text-ink-3">-</span>}</div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-1 text-[14.5px] font-semibold text-ink-2"><ThumbsDown size={15} className="text-danger" /> 부정적 반응</div>
                      <div className="flex flex-wrap gap-1.5">{priv.concern_tags.length ? priv.concern_tags.map((t) => <Tag key={t} tone="danger">{t}</Tag>) : <span className="text-[15px] text-ink-3">-</span>}</div>
                    </div>
                  </div>
                )}
                {priv.caution && (
                  <div className="flex gap-2 rounded-xl border border-warning/40 bg-warning-bg px-4 py-3 text-[16px] text-warning" data-testid="caution">
                    <AlertTriangle size={20} className="mt-0.5 shrink-0" /><div><b>주의사항</b> — {priv.caution}</div>
                  </div>
                )}
                <MemoBlock label="미팅이 잡힌 이유" value={priv.meeting_reason} />
                <MemoBlock label="미팅 시 꼭 알아야 할 것" value={priv.must_know} />
                <MemoBlock label="상대방 특징" value={priv.contact_traits} />
                <MemoBlock label="기타 코멘트" value={priv.extra_note} />
              </CardBody>
            </Card>
          ) : (
            <div className="fade-up-2 flex items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-white px-5 py-5" data-testid="private-locked">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-bg text-ink-2"><Lock size={22} /></span>
              <div>
                <p className="text-[17px] font-bold text-ink">담당자 연락처와 상세 콜 메모는 신청 후 공개됩니다</p>
                <p className="text-[15px] text-ink-2">선착순으로 담당이 확정되면 이 자리에 미팅 준비에 필요한 정보가 나타납니다.</p>
              </div>
            </div>
          )}

          {/* Follow-ups */}
          {followUps.length > 0 && (
            <Card className="fade-up-2">
              <CardHeader icon={<ClipboardList size={20} />} title="후속조치" count={followUps.filter((f) => f.status === "PENDING").length} />
              <CardBody><FollowUpList items={followUps} emptyText="" canComplete={mine || manager} /></CardBody>
            </Card>
          )}

          {/* Reports */}
          {reports.length > 0 && (
            <Card className="fade-up-3">
              <CardHeader icon={<MessageSquare size={20} />} title="미팅 결과" count={reports.length} />
              <CardBody className="grid gap-3">
                {reports.map((r) => (
                  <div key={r.id} className="rounded-xl border border-line bg-white px-4 py-3" data-testid="report-item">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <Badge tone={r.outcome === "DONE" ? "success" : r.outcome === "POSTPONED" ? "warning" : "neutral"}>{OUTCOME_LABEL[r.outcome]}</Badge>
                      {r.reaction && <Badge tone={r.reaction === "HIGH" ? "success" : r.reaction === "MID" ? "info" : "neutral"}>{REACTION_LABEL[r.reaction]}</Badge>}
                      {r.result && <Badge tone="info">{RESULT_LABEL[r.result]}</Badge>}
                      {r.next_action !== "NONE" && <Badge tone="purple">다음: {NEXT_ACTION_LABEL[r.next_action]}{r.next_action_date ? ` · ${fmtDate(r.next_action_date)}` : ""}</Badge>}
                    </div>
                    {r.memo && <p className="text-[16px] text-ink">{r.memo}</p>}
                    {r.detail_memo && <p className="mt-1 whitespace-pre-wrap text-[15px] text-ink-2">{r.detail_memo}</p>}
                    <p className="mt-1 text-[14px] text-ink-3">{r.reporter_name} · {fmtDateTime(r.created_at)}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="grid content-start gap-4">
          {assignments.length > 0 && (manager || viewer.profile.role === "CALLER" || mine) && (
            <Card className="fade-up-2">
              <CardHeader icon={<Users size={20} />} title="배정 이력" />
              <CardBody className="grid gap-2">
                {assignments.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 text-[15px]">
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${a.status === "ACTIVE" ? "bg-success" : "bg-line-strong"}`} />
                    <div>
                      <b className="text-ink">{a.consultant_name}</b> <span className="text-ink-2">· {a.method === "CLAIM" ? "선착순 신청" : `관리자 배정(${a.assigned_by_name})`}</span>
                      <div className="text-[14px] text-ink-3">{fmtDateTime(a.created_at)}{a.status === "RELEASED" && ` → 해제${a.released_reason ? ` (${a.released_reason})` : ""}`}</div>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
          <Card className="fade-up-3">
            <CardHeader icon={<History size={20} />} title="변경 이력" />
            <CardBody><ActivityTimeline logs={logs} /></CardBody>
          </Card>
          <p className="px-1 text-[14px] text-ink-3">등록 {lead.creator_name} · {fmtRelativeTime(lead.created_at)}</p>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, testId }: { label: string; value: React.ReactNode; testId?: string }) {
  return (
    <div className="rounded-xl bg-neutral-bg px-4 py-2.5">
      <div className="text-[14px] font-semibold text-ink-2">{label}</div>
      <div className="text-[17px] font-bold text-ink" data-testid={testId}>{value}</div>
    </div>
  );
}

function MemoBlock({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="mb-1 text-[14.5px] font-semibold text-ink-2">{label}</div>
      <p className="whitespace-pre-wrap rounded-xl border border-line bg-white px-4 py-3 text-[16px] leading-relaxed text-ink">{value}</p>
    </div>
  );
}
