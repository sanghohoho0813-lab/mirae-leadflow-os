import { notFound, redirect } from "next/navigation";
import { canTeach, isManager, requireViewer } from "@/lib/auth/session";
import { withUser } from "@/lib/db";
import { getTraining, listInstructors } from "@/lib/trainings";
import { PageHeader } from "@/components/ui/PageHeader";
import { TrainingForm } from "@/components/trainings/TrainingForm";
import { kstDateString, kstTimeString } from "@/lib/time";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function EditTrainingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer();
  const uid = viewer.session.userId;
  const data = await withUser(uid, async (tx) => ({ t: await getTraining(tx, id, uid), instructors: await listInstructors(tx) }));
  if (!data.t) notFound();
  const t = data.t;
  if (!canTeach(viewer) || !(isManager(viewer) || t.created_by === uid || t.instructor_id === uid)) redirect(`/trainings/${id}`);
  return (
    <div className="fade-up mx-auto max-w-3xl">
      <PageHeader back={`/trainings/${id}`} backLabel="교육 상세" title="교육 자료 수정" sub="자료를 더 올리거나 내용을 고친 뒤 [다시 정리]를 누르면 요약이 새로 만들어집니다." />
      <TrainingForm mode="edit" trainingId={id} me={uid} instructors={data.instructors}
        initial={{ title: t.title, date: kstDateString(t.held_at), time: kstTimeString(t.held_at), instructor_id: t.instructor_id, content: t.content ?? "", links: t.links, notice: t.notice ?? "", location: t.location ?? "" }} />
    </div>
  );
}
