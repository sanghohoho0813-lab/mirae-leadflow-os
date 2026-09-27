import { redirect } from "next/navigation";
import { Copy } from "lucide-react";
import { requireViewer } from "@/lib/auth/session";
import { withUser } from "@/lib/db";
import { listMembers } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { MemberRow } from "./MemberRow";
import { InviteCode } from "./InviteCode";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const viewer = await requireViewer();
  if (viewer.profile.role !== "OWNER") redirect("/");
  const members = await withUser(viewer.session.userId, listMembers);
  return (
    <div className="fade-up mx-auto max-w-3xl">
      <PageHeader title="구성원 관리" sub="초대코드를 단톡방에 올리면 각자 가입할 수 있습니다. 가입 직후 역할은 컨설턴트이며, 여기서 바꿀 수 있습니다." />
      <Card className="mb-4" tone="soft">
        <CardHeader icon={<Copy size={20} />} title="초대코드" />
        <CardBody><InviteCode code={viewer.organization.invite_code} /></CardBody>
      </Card>
      <Card>
        <CardHeader title="구성원" count={members.length} />
        <CardBody className="grid gap-2">
          {members.map((m) => <MemberRow key={m.id} member={m} isSelf={m.id === viewer.session.userId} />)}
        </CardBody>
      </Card>
    </div>
  );
}
