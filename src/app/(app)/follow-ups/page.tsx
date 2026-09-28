import Link from "next/link";
import { requireViewer, isManager } from "@/lib/auth/session";
import { withUser } from "@/lib/db";
import { listFollowUps } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { FollowUpList } from "@/components/leads/FollowUpCard";

export const dynamic = "force-dynamic";

export default async function FollowUpsPage({ searchParams }: { searchParams: Promise<{ scope?: string; status?: string }> }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const manager = isManager(viewer) || viewer.profile.role === "CALLER";
  const scope = manager && sp.scope !== "mine" ? "all" : "mine";
  const status = sp.status === "done" ? "DONE" : "PENDING";
  const items = await withUser(viewer.session.userId, (tx) => listFollowUps(tx, { scope, userId: viewer.session.userId, status }));
  const today = new Date();
  const overdue = items.filter((f) => status === "PENDING" && new Date(f.due_date + "T23:59:59+09:00") < today).length;

  const tab = (key: string, label: string, active: boolean) => (
    <Link prefetch={false} key={key} href={`/follow-ups?${key}`} role="tab" aria-selected={active} className={`flex h-11 items-center rounded-xl border px-4 text-[15.5px] font-semibold transition-base ${active ? "border-primary bg-primary text-white" : "border-line bg-white text-ink-2 hover:border-primary/40"}`}>{label}</Link>
  );

  return (
    <div className="fade-up">
      <PageHeader title="후속조치" sub={status === "PENDING" ? (overdue ? `예정일이 지난 후속조치가 ${overdue}건 있습니다.` : "예정일 순으로 정리되어 있습니다.") : "완료된 후속조치입니다."} />
      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist">
        {manager && tab(`scope=all&status=${status === "DONE" ? "done" : "pending"}`, "전체", scope === "all")}
        {manager && tab(`scope=mine&status=${status === "DONE" ? "done" : "pending"}`, "내 담당", scope === "mine")}
        {tab(`scope=${scope}&status=pending`, "예정", status === "PENDING")}
        {tab(`scope=${scope}&status=done`, "완료", status === "DONE")}
      </div>
      <p className="mb-2 text-[15px] font-semibold text-ink-3">{items.length}건</p>
      <FollowUpList items={items} emptyText={status === "PENDING" ? "예정된 후속조치가 없습니다." : "완료된 후속조치가 없습니다."} canComplete={status === "PENDING"} showAssignee={scope === "all"} />
    </div>
  );
}
