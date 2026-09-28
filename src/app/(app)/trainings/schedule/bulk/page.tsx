import { redirect } from "next/navigation";
import { canTeach, requireViewer } from "@/lib/auth/session";
import { withUser } from "@/lib/db";
import { listInstructors, listTrainingMonth } from "@/lib/trainings";
import { kstDateString } from "@/lib/time";
import { PageHeader } from "@/components/ui/PageHeader";
import { BulkScheduleForm } from "@/components/trainings/BulkScheduleForm";

export const dynamic = "force-dynamic";

export default async function BulkSchedulePage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const viewer = await requireViewer();
  if (!canTeach(viewer)) redirect("/trainings/schedule");
  const today = kstDateString();
  const { m } = await searchParams;
  const ym = m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : today.slice(0, 7);
  const [instructors, existing] = await withUser(viewer.session.userId, (tx) => Promise.all([listInstructors(tx), listTrainingMonth(tx, ym)]));
  return (
    <div className="fade-up mx-auto max-w-3xl">
      <PageHeader back={`/trainings/schedule?m=${ym}`} backLabel="교육 일정" title="한 달 교육 일정 등록"
        sub="월·수 교육이 미리 채워져 있습니다. 강사와 시간만 확인하고 저장하세요." />
      <BulkScheduleForm
        key={ym}
        ym={ym}
        today={today}
        me={viewer.session.userId}
        instructors={instructors}
        existing={existing.map((t) => ({ date: kstDateString(t.held_at), instructor_id: null, title: t.title, name: t.instructor_name }))}
      />
    </div>
  );
}
