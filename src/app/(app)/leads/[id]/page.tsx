import Link from "next/link";
import { SampleTag } from "@/components/ui/SampleTag";
import { NotFoundView } from "@/components/ui/NotFoundView";
import { Suspense } from "react";
import { MapPin, Clock, Building2, User, Lock, Phone, FileText, MessageSquare, History, ClipboardList, Users, AlertTriangle, Sparkles, Navigation, ClipboardCopy } from "lucide-react";
import { CopyButton } from "@/components/ui/CopyButton";
import { kakaoMapUrl, naverMapUrl } from "@/lib/geo";
import { requireViewer, canManageLead } from "@/lib/auth/session";
import { withUser } from "@/lib/db";
import { getLead, getLeadAssignments, getLeadFollowUps, getLeadLogs, getLeadPrivate, getLeadReports, listConsultants } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, Badge, Tag } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LeadActionBar } from "@/components/leads/LeadActions";
import { FollowUpList } from "@/components/leads/FollowUpCard";
import { QueryToast } from "@/components/leads/QueryToast";
import { ActivityTimeline } from "@/components/leads/ActivityTimeline";
import { OUTCOME_LABEL, REACTION_LABEL, RESULT_LABEL, NEXT_ACTION_LABEL } from "@/lib/labels";
import { fmtDateTime, fmtDate, relativeDay, daysSince, fmtRelativeTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lost?: string }> }) {
  const { id } = await params;
  const { lost } = await searchParams;
  const viewer = await requireViewer();
  const uid = viewer.session.userId;
  const data = await withUser(uid, async (tx) => {
    const lead = await getLead(tx, id);
    if (!lead) return null;
    const manager = canManageLead(viewer, lead);
    const claimer = (viewer.profile.role === "CONSULTANT" || viewer.profile.role === "LEADER") && lead.status === "OPEN";
    const limit = viewer.organization.claim_limit;
    const [priv, reports, followUps, assignments, logs, consultants, active] = await Promise.all([
      getLeadPrivate(tx, id), getLeadReports(tx, id), getLeadFollowUps(tx, id), getLeadAssignments(tx, id), getLeadLogs(tx, id),
      manager ? listConsultants(tx, lead.division_id) : Promise.resolve([]),
      claimer && limit > 0
        ? tx<{ id: string; company_name: string; passed: boolean }[]>`select id, company_name, meeting_at < now() as passed from leads where assigned_to = ${uid} and status = 'ASSIGNED' and meeting_round = 1 order by meeting_at`
        : Promise.resolve([]),
    ]);
    const blockedBy = limit > 0 && active.length >= limit ? active[0] : null;
    return { lead, priv, reports, followUps, assignments, logs, consultants, blockedBy, manager };
  });
  if (!data) return <NotFoundView />;
  const { lead, priv, reports, followUps, assignments, logs, consultants, blockedBy, manager } = data;
  const rel = relativeDay(lead.meeting_at);
  const mine = lead.assigned_to === uid;
  const consultantRole = viewer.profile.role === "CONSULTANT" || viewer.profile.role === "LEADER";

  return (
    <div className="fade-up">
      <Suspense><QueryToast /></Suspense>
      <PageHeader
        back={consultantRole ? (lead.status === "OPEN" ? "/leads?tab=open" : "/leads?tab=mine") : "/leads"}
        backLabel="목록"
        eyebrow={<div className="flex flex-wrap items-center gap-2">{lead.is_sample && <SampleTag size="lg" />}<StatusBadge status={lead.status} needsReport={lead.needs_report} size="lg" />{lead.needs_report && daysSince(lead.meeting_at) >= 1 && <Badge tone="danger" size="lg">{daysSince(lead.meeting_at)}일 경과</Badge>}{mine && <Badge tone="info" size="lg">내 담당</Badge>}{lead.division_name && <Badge tone="purple" size="lg">{lead.division_name} 전용 DB</Badge>}{lead.meeting_round > 1 && <Badge tone="info" size="lg">{lead.meeting_round}차 미팅</Badge>}</div>}
        title={lead.company_name}
        sub={<span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">{lead.industry && <span className="inline-flex items-center gap-1"><Building2 size={15} /> {lead.industry}</span>}<span className="inline-flex items-center gap-1"><MapPin size={15} /> {lead.region}</span></span>}
      />

      <div className="grid gap-4 @4xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-4">
          {/* Meeting summary + actions */}
          <Card className="fade-up">
            <CardBody className="pt-5">
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <div className={`rounded-xl px-4 py-3 ${rel.diff === 0 ? "bg-soft" : lead.needs_report ? "bg-danger-bg" : "bg-neutral-bg"}`}>
                  <div className="flex items-center gap-1.5 text-[0.875rem] font-semibold text-ink-2"><Clock size={15} /> 미팅 일시</div>
                  <div className="mt-0.5 text-[1.1875rem] font-extrabold text-ink" data-testid="meeting-at">{fmtDateTime(lead.meeting_at)}</div>
                  <div className={`text-[0.875rem] font-semibold ${rel.diff === 0 ? "text-primary" : lead.needs_report ? "text-danger" : "text-ink-3"}`}>{rel.label}</div>
                </div>
                <div className="rounded-xl bg-neutral-bg px-4 py-3">
                  <div className="flex items-center gap-1.5 text-[0.875rem] font-semibold text-ink-2"><User size={15} /> 담당 컨설턴트</div>
                  <div className="mt-0.5 text-[1.1875rem] font-extrabold text-ink" data-testid="assignee">{lead.assignee_name ?? (lead.status === "OPEN" ? "신청 가능" : "미정")}</div>
                  {lead.assigned_at && <div className="text-[0.875rem] text-ink-3">{fmtDate(lead.assigned_at)} 확정</div>}
                </div>
              </div>
              {lead.public_summary && <p className="mb-4 rounded-xl border border-line bg-white px-4 py-3 text-[1.0625rem] text-ink">{lead.public_summary}</p>}
              {lost === "1" && !mine && lead.status === "ASSIGNED" && (
                <div className="mb-4 rounded-2xl border border-warning/40 bg-warning-bg px-4 py-4 text-[1rem] font-semibold text-warning" data-testid="claim-lost">
                  아쉽지만 다른 컨설턴트가 먼저 신청했습니다. 다음 DB를 확인해 보세요.
                  <div className="mt-2"><Link prefetch={false} href="/leads?tab=open" className="inline-flex h-10 items-center rounded-xl border border-warning/40 bg-white px-4 text-[0.9375rem] font-semibold text-warning">신청 가능한 DB 보기</Link></div>
                </div>
              )}
              <LeadActionBar lead={lead} role={viewer.profile.role} userId={uid} consultants={consultants.map((c) => ({ id: c.id, full_name: c.full_name }))} phone={priv?.contact_phone ?? null} blockedBy={blockedBy} claimLimit={viewer.organization.claim_limit} canManage={manager} />
            </CardBody>
          </Card>

          {/* Private details */}
          {priv ? (
            <Card className="fade-up-2" testId="private-details">
              <CardHeader icon={<FileText size={20} />} title="미팅 준비 정보" right={<Badge tone="info">담당자·운영진만 열람</Badge>} />
              <CardBody className="grid gap-4">
                <div className="rounded-xl border border-primary/25 bg-soft/60 px-4 py-3.5" data-testid="meeting-address">
                  <div className="mb-1 flex items-center gap-1.5 text-[0.875rem] font-semibold text-ink-2"><MapPin size={15} /> 미팅 장소</div>
                  {priv.address ? (
                    <>
                      <p className="mb-3 select-all text-[1.125rem] font-bold leading-snug text-ink" data-testid="address-text">{priv.address}</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <CopyButton text={priv.address} label="주소 복사" done="주소를 복사했습니다" testId="copy-address" className="col-span-2 sm:col-span-1" />
                        <a href={kakaoMapUrl(priv.address)} target="_blank" rel="noopener noreferrer" className="press inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#FEE500] px-3 text-[0.9375rem] font-semibold text-[#191919] hover:brightness-95"><Navigation size={16} /> 카카오맵</a>
                        <a href={naverMapUrl(priv.address)} target="_blank" rel="noopener noreferrer" className="press inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#03C75A] px-3 text-[0.9375rem] font-semibold text-white hover:brightness-95"><Navigation size={16} /> 네이버지도</a>
                      </div>
                    </>
                  ) : (
                    <p className="text-[1rem] text-ink-2">{lead.region} · 상세 주소 미입력</p>
                  )}
                </div>
                <CopyButton
                  text={meetingInfoText({ company: lead.company_name, when: fmtDateTime(lead.meeting_at), address: priv.address ?? lead.region, contact: [priv.contact_name, priv.contact_title, priv.contact_phone].filter(Boolean).join(" "), interest: priv.interest_tags, comment: [priv.must_know, priv.caution && `주의: ${priv.caution}`, priv.extra_note].filter(Boolean).join("\n") })}
                  label="미팅 정보 전체 복사"
                  done="미팅 정보를 복사했습니다. 카톡에 그대로 붙여넣으세요"
                  icon={<ClipboardCopy size={17} />}
                  className="w-full"
                  testId="copy-meeting-info"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Info label="만나는 분" value={[priv.contact_name, priv.contact_title].filter(Boolean).join(" ") || "-"} />
                  <Info label="연락처" value={priv.contact_phone ? <a href={`tel:${priv.contact_phone.replace(/[^0-9+]/g, "")}`} className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"><Phone size={16} />{priv.contact_phone}</a> : "-"} testId="contact-phone" />
                </div>
                {priv.interest_tags.length > 0 && (
                  <div>
                    <div className="mb-1 flex items-center gap-1 text-[0.9062rem] font-semibold text-ink-2"><Sparkles size={15} className="text-success" /> 관심을 보인 분야</div>
                    <div className="flex flex-wrap gap-1.5" data-testid="interest-tags">{priv.interest_tags.map((t) => <Tag key={t} tone="success">{t}</Tag>)}</div>
                  </div>
                )}
                {priv.extra_note && (
                  <div className="rounded-xl border border-gold/50 bg-canvas px-4 py-3" data-testid="call-comment">
                    <div className="mb-1 text-[0.875rem] font-semibold text-ink-2">콜팀 코멘트 · 특이사항</div>
                    <p className="whitespace-pre-wrap text-[1.0625rem] leading-relaxed text-ink">{priv.extra_note}</p>
                  </div>
                )}
                {/* Older DBs (before the one-page form) may still carry these. */}
                {priv.caution && (
                  <div className="flex gap-2 rounded-xl border border-warning/40 bg-warning-bg px-4 py-3 text-[1rem] text-warning" data-testid="caution">
                    <AlertTriangle size={20} className="mt-0.5 shrink-0" /><div><b>주의사항</b> — {priv.caution}</div>
                  </div>
                )}
                <MemoBlock label="통화 주제" value={priv.call_topic} />
                <MemoBlock label="미팅이 잡힌 이유" value={priv.meeting_reason} />
                <MemoBlock label="미팅 시 꼭 알아야 할 것" value={priv.must_know} />
                <MemoBlock label="상대방 특징" value={priv.contact_traits} />
              </CardBody>
            </Card>
          ) : (
            <div className="fade-up-2 flex items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-white px-5 py-5" data-testid="private-locked">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-bg text-ink-2"><Lock size={22} /></span>
              <div>
                <p className="text-[1.0625rem] font-bold text-ink">담당자 연락처와 상세 콜 메모는 신청 후 공개됩니다</p>
                <p className="text-[0.9375rem] text-ink-2">선착순으로 담당이 확정되면 이 자리에 미팅 준비에 필요한 정보가 나타납니다.</p>
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
              <CardHeader icon={<MessageSquare size={20} />} title={reports.some((x) => x.round > 1) ? "차수별 미팅 결과" : "미팅 결과"} count={reports.length} />
              <CardBody className="grid gap-3">
                {reports.map((r) => (
                  <div key={r.id} className="rounded-xl border border-line bg-white px-4 py-3" data-testid="report-item">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      {reports.some((x) => x.round > 1) && <Badge tone="info" size="lg">{r.round}차 미팅</Badge>}
                      <Badge tone={r.outcome === "DONE" ? "success" : r.outcome === "POSTPONED" ? "warning" : "neutral"}>{OUTCOME_LABEL[r.outcome]}</Badge>
                      {r.reaction && <Badge tone={r.reaction === "HIGH" ? "success" : r.reaction === "MID" ? "info" : "neutral"}>{REACTION_LABEL[r.reaction]}</Badge>}
                      {r.result && <Badge tone="info">{RESULT_LABEL[r.result]}</Badge>}
                      {r.next_action !== "NONE" && <Badge tone="purple">다음: {NEXT_ACTION_LABEL[r.next_action]}{r.next_action_date ? ` · ${fmtDate(r.next_action_date)}` : ""}</Badge>}
                    </div>
                    {r.memo && <p className="text-[1rem] text-ink">{r.memo}</p>}
                    {(r.topics?.length > 0 || r.materials?.length > 0 || r.next_note) && (
                      <dl className="mt-2 grid gap-1 rounded-lg bg-canvas px-3 py-2 text-[0.9375rem]">
                        {r.topics?.length > 0 && <div className="flex gap-2"><dt className="w-[72px] shrink-0 font-semibold text-ink-3">상담 분야</dt><dd className="text-ink">{r.topics.join(", ")}</dd></div>}
                        {r.materials?.length > 0 && <div className="flex gap-2"><dt className="w-[72px] shrink-0 font-semibold text-ink-3">자료</dt><dd className="text-ink">{r.materials.join(", ")}</dd></div>}
                        {r.next_note && <div className="flex gap-2"><dt className="w-[72px] shrink-0 font-semibold text-ink-3">할 일</dt><dd className="text-ink">{r.next_note}</dd></div>}
                      </dl>
                    )}
                    {r.detail_memo && <p className="mt-1 whitespace-pre-wrap text-[0.9375rem] text-ink-2">{r.detail_memo}</p>}
                    <p className="mt-1 text-[0.875rem] text-ink-3">{r.reporter_name} · {fmtDateTime(r.created_at)}</p>
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
                  <div key={a.id} className="flex items-start gap-2 text-[0.9375rem]">
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${a.status === "ACTIVE" ? "bg-success" : "bg-line-strong"}`} />
                    <div>
                      <b className="text-ink">{a.consultant_name}</b> <span className="text-ink-2">· {a.method === "CLAIM" ? "선착순 신청" : `관리자 배정(${a.assigned_by_name})`}</span>
                      <div className="text-[0.875rem] text-ink-3">{fmtDateTime(a.created_at)}{a.status === "RELEASED" && ` → 해제${a.released_reason ? ` (${a.released_reason})` : ""}`}</div>
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
          <p className="px-1 text-[0.875rem] text-ink-3">등록 {lead.creator_name} · {fmtRelativeTime(lead.created_at)}</p>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, testId }: { label: string; value: React.ReactNode; testId?: string }) {
  return (
    <div className="rounded-xl bg-neutral-bg px-4 py-2.5">
      <div className="text-[0.875rem] font-semibold text-ink-2">{label}</div>
      <div className="text-[1.0625rem] font-bold text-ink" data-testid={testId}>{value}</div>
    </div>
  );
}

function MemoBlock({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="mb-1 text-[0.9062rem] font-semibold text-ink-2">{label}</div>
      <p className="whitespace-pre-wrap rounded-xl border border-line bg-white px-4 py-3 text-[1rem] leading-relaxed text-ink">{value}</p>
    </div>
  );
}

function meetingInfoText(m: { company: string; when: string; address: string; contact: string; interest: string[]; comment: string }): string {
  return [
    `[미팅] ${m.company}`,
    `일시: ${m.when} (방문)`,
    `장소: ${m.address}`,
    m.contact && `상대: ${m.contact}`,
    m.interest.length > 0 && `관심: ${m.interest.join(", ")}`,
    m.comment && `메모: ${m.comment}`,
  ].filter(Boolean).join("\n");
}
