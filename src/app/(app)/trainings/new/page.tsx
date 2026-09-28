import { redirect } from "next/navigation";
import { canTeach, requireViewer } from "@/lib/auth/session";
import { withUser } from "@/lib/db";
import { listInstructors } from "@/lib/trainings";
import { PageHeader } from "@/components/ui/PageHeader";
import { TrainingForm } from "@/components/trainings/TrainingForm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function NewTrainingPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const viewer = await requireViewer();
  if (!canTeach(viewer)) redirect("/trainings");
  const { date } = await searchParams;
  const instructors = await withUser(viewer.session.userId, (tx) => listInstructors(tx));
  return (
    <div className="fade-up mx-auto max-w-3xl">
      <PageHeader back="/trainings" backLabel="교육 자료실" title="교육 자료 올리기" sub="자료와 강의 내용을 올리면 모두가 앱에서 보고, AI가 핵심을 정리합니다." />
      <TrainingForm mode="create" instructors={instructors} me={viewer.session.userId} initial={date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? { date } : undefined} />
    </div>
  );
}
