import { redirect } from "next/navigation";
import { Copy, Hand, Users } from "lucide-react";
import { isLeader, isManager, requireViewer } from "@/lib/auth/session";
import { withUser } from "@/lib/db";
import { listDivisions, listMembers } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { MemberRow } from "./MemberRow";
import { InviteCode } from "./InviteCode";
import { ClaimLimit } from "./ClaimLimit";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const viewer = await requireViewer();
  const owner = viewer.profile.role === "OWNER";
  const leader = isLeader(viewer);
  if (!isManager(viewer) && !leader) redirect("/");
  const [all, divisions] = await withUser(viewer.session.userId, (tx) => Promise.all([listMembers(tx), listDivisions(tx)]));
  // 본부장 sees and manages only their own 본부.
  const members = leader ? all.filter((m) => m.division_id === viewer.profile.division_id) : all;
  const mode = owner ? "owner" : leader ? "leader" : "view";
  const groups = [
    { key: "hq", title: "단장 · 비서 · 콜팀", items: members.filter((m) => !m.division_id && m.role !== "CONSULTANT" && m.role !== "LEADER") },
    ...divisions.map((d) => ({ key: d.id, title: d.claims_org_leads ? d.name : `${d.name} (교육 자료만 · 서울·경기 DB 신청 없음)`, items: members.filter((m) => m.division_id === d.id) })),
    { key: "none", title: "본부 미배정", items: members.filter((m) => !m.division_id && (m.role === "CONSULTANT" || m.role === "LEADER")) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="fade-up mx-auto max-w-4xl">
      <PageHeader
        title={leader ? `${viewer.division?.name ?? "본부"} 본부원 관리` : "구성원 관리"}
        sub={owner ? "역할·본부·직함은 단장님이 최종으로 정합니다. 본부장님은 자기 본부원의 직함(지점장·팀장)을 관리할 수 있습니다."
          : leader ? "우리 본부 사람의 직함(지점장·팀장)과 활성 여부를 관리합니다. 본부 이동과 역할 변경은 단장님께 요청해 주세요."
          : "구성원 현황입니다. 역할 변경은 단장님이 합니다."}
      />
      {(owner || isManager(viewer)) && (
        <div className="mb-4 grid gap-4 @3xl:grid-cols-2">
          <Card tone="soft">
            <CardHeader icon={<Copy size={20} />} title="초대코드" />
            <CardBody><InviteCode code={viewer.organization.invite_code} /></CardBody>
          </Card>
          <Card testId="claim-limit-card">
            <CardHeader icon={<Hand size={20} />} title="1인 동시 진행 한도" />
            <CardBody><ClaimLimit value={viewer.organization.claim_limit} /></CardBody>
          </Card>
        </div>
      )}
      <div className="grid gap-4">
        {groups.map((g) => (
          <Card key={g.key} testId={`member-group-${g.key}`}>
            <CardHeader icon={<Users size={20} />} title={g.title} count={g.items.length} />
            <CardBody className="grid gap-2">
              {g.items.map((m) => <MemberRow key={m.id} member={m} isSelf={m.id === viewer.session.userId} mode={mode} divisions={divisions.map((d) => ({ id: d.id, name: d.name }))} />)}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
