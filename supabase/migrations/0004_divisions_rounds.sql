-- =====================================================================
-- 0004 — 본부(division) 체계 · 본부 DB · 미팅 차수(2차·3차) · 진행 메모 · 교육 안내
--
-- 누가 무엇을 보나
--   단장(OWNER)·비서(MANAGER)   : 전부
--   콜팀(CALLER)                : 사업단 공통 DB만 (본부 DB는 안 보임)
--   본부장(LEADER)              : 자기 본부 DB 전부 + 사업단 공통 DB(신청용)
--   본부원(CONSULTANT)          : 자기 본부 DB + (신청 가능한 본부라면) 사업단 공통 DB
--   광주 상무본부처럼 claims_org_leads=false 인 본부는 사업단 공통 DB를 보지도 신청하지도 않음
-- =====================================================================

create table if not exists divisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  sort int not null default 0,
  claims_org_leads boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);
alter table divisions enable row level security;
create policy divisions_select on divisions for select to authenticated using (organization_id = lf_org_id());

alter table profiles add column if not exists division_id uuid references divisions(id);
alter table leads add column if not exists division_id uuid references divisions(id);
alter table leads add column if not exists meeting_round int not null default 1;
alter table meeting_reports add column if not exists round int not null default 1;
alter table trainings add column if not exists notice text;
create index if not exists leads_division_idx on leads(division_id);
create index if not exists profiles_division_idx on profiles(division_id);

-- ------------------------------------------------------------ helpers
create or replace function lf_division() returns uuid
language sql stable security definer set search_path = public as $$
  select division_id from profiles where id = auth.uid()
$$;

-- People without a 본부 yet (e.g. just signed up) may use the shared DBs.
create or replace function lf_claims_org() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select d.claims_org_leads from profiles p join divisions d on d.id = p.division_id where p.id = auth.uid()), true)
$$;

-- May I run this DB (publish, assign, report for it)? 단장·비서 always; 본부장 for own 본부 DB.
create or replace function lf_can_manage(p_division uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(lf_is_manager() or (p_division is not null and lf_role() = 'LEADER' and p_division = lf_division()), false)
$$;

-- May I see the work (reports, follow-ups, history) on this DB?
create or replace function lf_oversees(p_division uuid, p_assignee uuid, p_creator uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(lf_is_manager()
    or p_creator = auth.uid() or p_assignee = auth.uid()
    or (lf_role() = 'CALLER' and p_division is null)
    or (lf_role() = 'LEADER' and lf_division() is not null and (
          p_division = lf_division()
          or exists (select 1 from profiles a where a.id = p_assignee and a.division_id = lf_division()))), false)
$$;

-- ------------------------------------------------------------- policies
drop policy if exists leads_select on leads;
drop policy if exists leads_insert on leads;
drop policy if exists leads_update on leads;
create policy leads_select on leads for select to authenticated
  using (
    organization_id = lf_org_id() and (
      lf_is_manager()
      or created_by = auth.uid() or assigned_to = auth.uid()
      or (division_id is null and lf_role() = 'CALLER')
      or (division_id is not null and lf_role() = 'LEADER' and division_id = lf_division())
      or (status in ('OPEN', 'ASSIGNED', 'FOLLOW_UP', 'CLOSED') and (
            (division_id is null and lf_claims_org())
            or division_id = lf_division()))
    )
  );
create policy leads_insert on leads for insert to authenticated
  with check (
    organization_id = lf_org_id() and created_by = auth.uid() and status = 'DRAFT' and (
      (division_id is null and lf_role() in ('OWNER', 'MANAGER', 'CALLER'))
      or (division_id is not null and lf_is_manager())
      or (lf_role() = 'LEADER' and division_id = lf_division())
    )
  );
create policy leads_update on leads for update to authenticated
  using (
    organization_id = lf_org_id() and (
      lf_can_manage(division_id) or (lf_role() = 'CALLER' and created_by = auth.uid() and division_id is null)
    )
  )
  with check (
    organization_id = lf_org_id() and (
      lf_is_manager() or (lf_role() = 'LEADER' and division_id = lf_division()) or (lf_role() = 'CALLER' and division_id is null)
    )
  );

drop policy if exists lead_private_select on lead_private_details;
drop policy if exists lead_private_insert on lead_private_details;
drop policy if exists lead_private_update on lead_private_details;
create policy lead_private_select on lead_private_details for select to authenticated
  using (
    organization_id = lf_org_id() and (
      lf_is_manager()
      or exists (select 1 from leads l where l.id = lead_id and (
        l.assigned_to = auth.uid() or l.created_by = auth.uid()
        or (l.division_id is not null and lf_role() = 'LEADER' and l.division_id = lf_division())))
    )
  );
create policy lead_private_insert on lead_private_details for insert to authenticated
  with check (
    organization_id = lf_org_id()
    and exists (select 1 from leads l where l.id = lead_id and (lf_can_manage(l.division_id) or l.created_by = auth.uid()))
  );
create policy lead_private_update on lead_private_details for update to authenticated
  using (
    organization_id = lf_org_id()
    and exists (select 1 from leads l where l.id = lead_id and (lf_can_manage(l.division_id) or l.created_by = auth.uid()))
  );

drop policy if exists assignments_select on lead_assignments;
create policy assignments_select on lead_assignments for select to authenticated
  using (
    organization_id = lf_org_id() and (
      consultant_id = auth.uid()
      or exists (select 1 from leads l where l.id = lead_id and lf_oversees(l.division_id, l.assigned_to, l.created_by))
    )
  );

drop policy if exists reports_select on meeting_reports;
create policy reports_select on meeting_reports for select to authenticated
  using (
    organization_id = lf_org_id() and (
      reporter_id = auth.uid()
      or exists (select 1 from leads l where l.id = lead_id and lf_oversees(l.division_id, l.assigned_to, l.created_by))
    )
  );

drop policy if exists follow_ups_select on follow_ups;
create policy follow_ups_select on follow_ups for select to authenticated
  using (
    organization_id = lf_org_id() and (
      assignee_id = auth.uid()
      or exists (select 1 from leads l where l.id = lead_id and lf_oversees(l.division_id, l.assigned_to, l.created_by))
    )
  );

drop policy if exists logs_select on activity_logs;
create policy logs_select on activity_logs for select to authenticated
  using (
    organization_id = lf_org_id() and (
      actor_id = auth.uid()
      or (lead_id is null and lf_is_manager())
      or exists (select 1 from leads l where l.id = lead_id and lf_oversees(l.division_id, l.assigned_to, l.created_by))
    )
  );

-- ------------------------------------------------------------------ RPCs
create or replace function publish_lead(p_lead_id uuid)
returns leads
language plpgsql security definer set search_path = public as $$
declare v_lead leads; v_div uuid;
begin
  select division_id into v_div from leads where id = p_lead_id and organization_id = lf_org_id();
  if not lf_can_manage(v_div) then raise exception 'FORBIDDEN'; end if;
  update leads set status = 'OPEN', published_at = now()
  where id = p_lead_id and organization_id = lf_org_id() and status = 'DRAFT'
  returning * into v_lead;
  if v_lead.id is null then raise exception 'INVALID_STATE'; end if;
  perform lf_log(p_lead_id, 'PUBLISH', 'DRAFT', 'OPEN');
  return v_lead;
end $$;

create or replace function unpublish_lead(p_lead_id uuid)
returns leads
language plpgsql security definer set search_path = public as $$
declare v_lead leads; v_div uuid;
begin
  select division_id into v_div from leads where id = p_lead_id and organization_id = lf_org_id();
  if not lf_can_manage(v_div) then raise exception 'FORBIDDEN'; end if;
  update leads set status = 'DRAFT', published_at = null
  where id = p_lead_id and organization_id = lf_org_id() and status = 'OPEN'
  returning * into v_lead;
  if v_lead.id is null then raise exception 'INVALID_STATE'; end if;
  perform lf_log(p_lead_id, 'UNPUBLISH', 'OPEN', 'DRAFT');
  return v_lead;
end $$;

-- First-come-first-served claim, now limited to the DBs this person may see:
-- 본부 DB → only that 본부; 사업단 DB → only 본부 that take shared DBs.
-- The 1-person limit counts first meetings only (2차·3차 미팅은 제외).
create or replace function claim_lead(p_lead_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_lead leads; v_role member_role; v_uid uuid := auth.uid(); v_limit int; v_active int; v_active_id uuid; v_div uuid; v_found boolean;
begin
  v_role := lf_role();
  if v_role is null then return jsonb_build_object('ok', false, 'code', 'NOT_MEMBER'); end if;
  if v_role not in ('CONSULTANT', 'LEADER') then return jsonb_build_object('ok', false, 'code', 'ROLE_NOT_ALLOWED'); end if;
  perform 1 from profiles where id = v_uid and is_active for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'INACTIVE'); end if;

  select division_id, true into v_div, v_found from leads where id = p_lead_id and organization_id = lf_org_id();
  -- coalesce: a NULL comparison must mean "not allowed", never "skip the check".
  if v_found and not coalesce((v_div is null and lf_claims_org()) or (v_div is not null and v_div = lf_division()), false) then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  select claim_limit into v_limit from organizations where id = lf_org_id();
  if coalesce(v_limit, 0) > 0 then
    select count(*)::int, (array_agg(id order by meeting_at))[1] into v_active, v_active_id
      from leads where assigned_to = v_uid and status = 'ASSIGNED' and meeting_round = 1 and id <> p_lead_id;
    if v_active >= v_limit then
      if not exists (select 1 from leads where id = p_lead_id and assigned_to = v_uid) then
        return jsonb_build_object('ok', false, 'code', 'LIMIT_REACHED', 'limit', v_limit, 'active_lead_id', v_active_id);
      end if;
    end if;
  end if;

  update leads
     set status = 'ASSIGNED', assigned_to = v_uid, assigned_at = now()
   where id = p_lead_id
     and organization_id = lf_org_id()
     and status = 'OPEN'
     and assigned_to is null
  returning * into v_lead;

  if v_lead.id is null then
    select * into v_lead from leads where id = p_lead_id and organization_id = lf_org_id();
    if v_lead.id is null or v_lead.status = 'DRAFT' then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
    if v_lead.assigned_to = v_uid then return jsonb_build_object('ok', false, 'code', 'ALREADY_MINE'); end if;
    if v_lead.status = 'ASSIGNED' then return jsonb_build_object('ok', false, 'code', 'ALREADY_ASSIGNED'); end if;
    return jsonb_build_object('ok', false, 'code', 'NOT_OPEN', 'status', v_lead.status);
  end if;

  insert into lead_assignments(organization_id, lead_id, consultant_id, assigned_by, method)
  values (v_lead.organization_id, p_lead_id, v_uid, v_uid, 'CLAIM');
  perform lf_log(p_lead_id, 'CLAIM', 'OPEN', 'ASSIGNED', jsonb_build_object('consultant_id', v_uid));
  return jsonb_build_object('ok', true, 'code', 'CLAIMED', 'lead_id', v_lead.id);
end $$;

create or replace function release_lead(p_lead_id uuid, p_reason text default null)
returns leads
language plpgsql security definer set search_path = public as $$
declare v_lead leads; v_prev uuid; v_div uuid;
begin
  select assigned_to, division_id into v_prev, v_div from leads where id = p_lead_id and organization_id = lf_org_id() and status = 'ASSIGNED';
  if not found then
    if not lf_is_manager() and lf_role() <> 'LEADER' then raise exception 'FORBIDDEN'; end if;
    raise exception 'INVALID_STATE';
  end if;
  if not lf_can_manage(v_div) then raise exception 'FORBIDDEN'; end if;
  update leads set status = 'OPEN', assigned_to = null, assigned_at = null where id = p_lead_id returning * into v_lead;
  update lead_assignments set status = 'RELEASED', released_reason = coalesce(p_reason, '관리자 회수'), released_at = now()
   where lead_id = p_lead_id and status = 'ACTIVE';
  perform lf_log(p_lead_id, 'RELEASE', 'ASSIGNED', 'OPEN', jsonb_build_object('previous_consultant_id', v_prev, 'reason', p_reason));
  return v_lead;
end $$;

create or replace function reassign_lead(p_lead_id uuid, p_consultant_id uuid, p_reason text default null)
returns leads
language plpgsql security definer set search_path = public as $$
declare v_lead leads; v_prev uuid; v_from lead_status; v_div uuid; v_target_div uuid; v_target_claims boolean;
begin
  select assigned_to, status, division_id into v_prev, v_from, v_div from leads
   where id = p_lead_id and organization_id = lf_org_id() and status in ('OPEN', 'ASSIGNED');
  if not found then
    if not lf_is_manager() and lf_role() <> 'LEADER' then raise exception 'FORBIDDEN'; end if;
    raise exception 'INVALID_STATE';
  end if;
  if not lf_can_manage(v_div) then raise exception 'FORBIDDEN'; end if;

  select p.division_id, coalesce(d.claims_org_leads, true) into v_target_div, v_target_claims
    from profiles p left join divisions d on d.id = p.division_id
   where p.id = p_consultant_id and p.organization_id = lf_org_id() and p.is_active and p.role in ('CONSULTANT', 'LEADER');
  if not found then raise exception 'INVALID_CONSULTANT'; end if;
  -- 본부 DB goes to that 본부 only; shared DBs to 본부 that take them.
  if (v_div is not null and v_target_div is distinct from v_div) or (v_div is null and not v_target_claims) then
    raise exception 'INVALID_CONSULTANT';
  end if;
  if v_prev = p_consultant_id then raise exception 'SAME_CONSULTANT'; end if;

  update lead_assignments set status = 'RELEASED', released_reason = coalesce(p_reason, '관리자 재배정'), released_at = now()
   where lead_id = p_lead_id and status = 'ACTIVE';
  update leads set status = 'ASSIGNED', assigned_to = p_consultant_id, assigned_at = now() where id = p_lead_id returning * into v_lead;
  insert into lead_assignments(organization_id, lead_id, consultant_id, assigned_by, method)
  values (v_lead.organization_id, p_lead_id, p_consultant_id, auth.uid(), 'MANUAL');
  perform lf_log(p_lead_id, case when v_prev is null then 'ASSIGN' else 'REASSIGN' end, v_from, 'ASSIGNED',
    jsonb_build_object('previous_consultant_id', v_prev, 'consultant_id', p_consultant_id, 'reason', p_reason));
  return v_lead;
end $$;

create or replace function reschedule_lead(p_lead_id uuid, p_meeting_at timestamptz, p_reason text default null)
returns leads
language plpgsql security definer set search_path = public as $$
declare v_lead leads; v_old timestamptz;
begin
  select meeting_at into v_old from leads
   where id = p_lead_id and organization_id = lf_org_id()
     and status in ('DRAFT', 'OPEN', 'ASSIGNED')
     and (lf_can_manage(division_id) or (lf_role() = 'CALLER' and created_by = auth.uid()) or assigned_to = auth.uid());
  if not found then raise exception 'FORBIDDEN'; end if;
  update leads set meeting_at = p_meeting_at where id = p_lead_id returning * into v_lead;
  perform lf_log(p_lead_id, 'RESCHEDULE', v_lead.status, v_lead.status,
    jsonb_build_object('from', v_old, 'to', p_meeting_at, 'reason', p_reason));
  return v_lead;
end $$;

create or replace function cancel_lead(p_lead_id uuid, p_reason text)
returns leads
language plpgsql security definer set search_path = public as $$
declare v_lead leads; v_from lead_status; v_div uuid;
begin
  select status, division_id into v_from, v_div from leads where id = p_lead_id and organization_id = lf_org_id() and status not in ('CANCELLED', 'CLOSED');
  if not found then
    if not lf_is_manager() and lf_role() <> 'LEADER' then raise exception 'FORBIDDEN'; end if;
    raise exception 'INVALID_STATE';
  end if;
  if not lf_can_manage(v_div) then raise exception 'FORBIDDEN'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then raise exception 'REASON_REQUIRED'; end if;
  update leads set status = 'CANCELLED', cancel_reason = p_reason, closed_at = now() where id = p_lead_id returning * into v_lead;
  update lead_assignments set status = 'RELEASED', released_reason = 'DB 취소', released_at = now() where lead_id = p_lead_id and status = 'ACTIVE';
  update follow_ups set status = 'CANCELLED' where lead_id = p_lead_id and status = 'PENDING';
  perform lf_log(p_lead_id, 'CANCEL_LEAD', v_from, 'CANCELLED', jsonb_build_object('reason', p_reason));
  return v_lead;
end $$;

-- Meeting report, now per round (1차·2차·3차…). "재방문" with a date books the next
-- round straight away instead of leaving a to-do.
drop function if exists submit_meeting_report(uuid, meeting_outcome, reaction_level, meeting_result, next_action, date, text, text, timestamptz, text[], text[], text);

create or replace function submit_meeting_report(
  p_lead_id uuid,
  p_outcome meeting_outcome,
  p_reaction reaction_level default null,
  p_result meeting_result default null,
  p_next_action next_action default 'NONE',
  p_next_action_date date default null,
  p_memo text default null,
  p_detail_memo text default null,
  p_new_meeting_at timestamptz default null,
  p_topics text[] default '{}',
  p_materials text[] default '{}',
  p_next_note text default null,
  p_next_meeting_at timestamptz default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_lead leads; v_uid uuid := auth.uid(); v_report_id uuid; v_follow_id uuid;
  v_to lead_status; v_assignee uuid;
begin
  select * into v_lead from leads where id = p_lead_id and organization_id = lf_org_id();
  if v_lead.id is null then raise exception 'NOT_FOUND'; end if;
  if not (lf_can_manage(v_lead.division_id) or v_lead.assigned_to = v_uid) then raise exception 'FORBIDDEN'; end if;
  if v_lead.status not in ('ASSIGNED', 'FOLLOW_UP') then raise exception 'INVALID_STATE'; end if;
  if v_lead.assigned_to is null then raise exception 'NO_ASSIGNEE'; end if;
  v_assignee := v_lead.assigned_to;

  if p_outcome = 'POSTPONED' then
    if p_new_meeting_at is null then raise exception 'NEW_MEETING_REQUIRED'; end if;
  elsif p_outcome = 'DONE' then
    if p_reaction is null or p_result is null then raise exception 'REACTION_RESULT_REQUIRED'; end if;
  end if;
  if p_next_action <> 'NONE' and p_next_action_date is null and p_next_meeting_at is null then raise exception 'NEXT_DATE_REQUIRED'; end if;

  insert into meeting_reports(organization_id, lead_id, reporter_id, outcome, reaction, result, next_action, next_action_date,
    memo, detail_memo, topics, materials, next_note, round)
  values (v_lead.organization_id, p_lead_id, v_uid, p_outcome, p_reaction, p_result, p_next_action,
    coalesce(p_next_action_date, (p_next_meeting_at at time zone 'Asia/Seoul')::date),
    nullif(trim(p_memo), ''), nullif(trim(p_detail_memo), ''), coalesce(p_topics, '{}'), coalesce(p_materials, '{}'), nullif(trim(p_next_note), ''),
    v_lead.meeting_round)
  returning id into v_report_id;

  if p_outcome = 'POSTPONED' then
    v_to := 'ASSIGNED';
    update leads set status = 'ASSIGNED', meeting_at = p_new_meeting_at where id = p_lead_id;
    perform lf_log(p_lead_id, 'RESCHEDULE', v_lead.status, 'ASSIGNED', jsonb_build_object('from', v_lead.meeting_at, 'to', p_new_meeting_at, 'reason', '미팅 연기'));
  elsif p_next_action = 'REVISIT' and p_next_meeting_at is not null then
    v_to := 'ASSIGNED';
    update leads set status = 'ASSIGNED', meeting_at = p_next_meeting_at, meeting_round = meeting_round + 1 where id = p_lead_id;
    perform lf_log(p_lead_id, 'NEXT_ROUND', v_lead.status, 'ASSIGNED', jsonb_build_object('round', v_lead.meeting_round + 1, 'at', p_next_meeting_at));
  elsif p_next_action <> 'NONE' then
    v_to := 'FOLLOW_UP';
    update leads set status = 'FOLLOW_UP' where id = p_lead_id;
    insert into follow_ups(organization_id, lead_id, assignee_id, action, due_date, memo, created_by)
    values (v_lead.organization_id, p_lead_id, v_assignee, p_next_action, p_next_action_date,
      coalesce(nullif(trim(p_next_note), ''), nullif(trim(p_memo), '')), v_uid)
    returning id into v_follow_id;
  else
    v_to := 'CLOSED';
    update leads set status = 'CLOSED', closed_at = now() where id = p_lead_id;
  end if;

  perform lf_log(p_lead_id, 'REPORT', v_lead.status, v_to, jsonb_build_object(
    'report_id', v_report_id, 'round', v_lead.meeting_round, 'outcome', p_outcome, 'reaction', p_reaction, 'result', p_result,
    'next_action', p_next_action, 'next_action_date', p_next_action_date, 'follow_up_id', v_follow_id));
  return jsonb_build_object('ok', true, 'report_id', v_report_id, 'follow_up_id', v_follow_id, 'status', v_to);
end $$;

create or replace function complete_follow_up(
  p_follow_up_id uuid,
  p_done_note text default null,
  p_next_action next_action default 'NONE',
  p_next_action_date date default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_fu follow_ups; v_lead leads; v_uid uuid := auth.uid(); v_next uuid; v_to lead_status;
begin
  select * into v_fu from follow_ups where id = p_follow_up_id and organization_id = lf_org_id();
  if v_fu.id is null then raise exception 'NOT_FOUND'; end if;
  select * into v_lead from leads where id = v_fu.lead_id;
  if not (lf_can_manage(v_lead.division_id) or v_fu.assignee_id = v_uid) then raise exception 'FORBIDDEN'; end if;
  if v_fu.status <> 'PENDING' then raise exception 'INVALID_STATE'; end if;
  if p_next_action <> 'NONE' and p_next_action_date is null then raise exception 'NEXT_DATE_REQUIRED'; end if;

  update follow_ups set status = 'DONE', done_note = nullif(trim(p_done_note), ''), done_at = now() where id = p_follow_up_id;

  if p_next_action <> 'NONE' then
    insert into follow_ups(organization_id, lead_id, assignee_id, action, due_date, created_by)
    values (v_fu.organization_id, v_fu.lead_id, v_fu.assignee_id, p_next_action, p_next_action_date, v_uid)
    returning id into v_next;
    v_to := 'FOLLOW_UP';
    update leads set status = 'FOLLOW_UP' where id = v_fu.lead_id and status <> 'CANCELLED';
  elsif not exists (select 1 from follow_ups where lead_id = v_fu.lead_id and status = 'PENDING') then
    v_to := 'CLOSED';
    update leads set status = 'CLOSED', closed_at = now() where id = v_fu.lead_id and status = 'FOLLOW_UP';
  else
    v_to := v_lead.status;
  end if;

  perform lf_log(v_fu.lead_id, 'FOLLOW_UP_DONE', v_lead.status, v_to, jsonb_build_object(
    'follow_up_id', p_follow_up_id, 'action', v_fu.action, 'note', p_done_note, 'next_action', p_next_action, 'next_follow_up_id', v_next));
  return jsonb_build_object('ok', true, 'next_follow_up_id', v_next, 'status', v_to);
end $$;

-- 2차·3차 미팅 잡기 (결과 입력 후, 또는 종료된 고객이 다시 연락 왔을 때).
create or replace function schedule_next_meeting(p_lead_id uuid, p_meeting_at timestamptz)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_lead leads;
begin
  select * into v_lead from leads where id = p_lead_id and organization_id = lf_org_id();
  if v_lead.id is null then raise exception 'NOT_FOUND'; end if;
  if not (lf_can_manage(v_lead.division_id) or v_lead.assigned_to = auth.uid()) then raise exception 'FORBIDDEN'; end if;
  if v_lead.status not in ('FOLLOW_UP', 'CLOSED') or v_lead.assigned_to is null then raise exception 'INVALID_STATE'; end if;
  if p_meeting_at is null then raise exception 'NEW_MEETING_REQUIRED'; end if;
  update leads set status = 'ASSIGNED', meeting_at = p_meeting_at, meeting_round = meeting_round + 1, closed_at = null where id = p_lead_id;
  update follow_ups set status = 'DONE', done_note = coalesce(done_note, (v_lead.meeting_round + 1) || '차 미팅으로 이어짐'), done_at = now()
   where lead_id = p_lead_id and status = 'PENDING';
  perform lf_log(p_lead_id, 'NEXT_ROUND', v_lead.status, 'ASSIGNED', jsonb_build_object('round', v_lead.meeting_round + 1, 'at', p_meeting_at));
  return jsonb_build_object('ok', true, 'round', v_lead.meeting_round + 1);
end $$;

-- 진행 메모: a short comment on the DB's history, any time.
create or replace function add_lead_note(p_lead_id uuid, p_text text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_lead leads;
begin
  select * into v_lead from leads where id = p_lead_id and organization_id = lf_org_id();
  if v_lead.id is null then raise exception 'NOT_FOUND'; end if;
  if not (lf_can_manage(v_lead.division_id) or v_lead.assigned_to = auth.uid() or v_lead.created_by = auth.uid()) then raise exception 'FORBIDDEN'; end if;
  if p_text is null or length(trim(p_text)) = 0 then raise exception 'VALIDATION'; end if;
  perform lf_log(p_lead_id, 'NOTE', v_lead.status, v_lead.status, jsonb_build_object('text', left(trim(p_text), 1000), 'round', v_lead.meeting_round));
end $$;

-- 구성원 관리: 단장 = 모두 (역할·본부·직함), 본부장 = 자기 본부 본부원의 직함만.
create or replace function set_member_profile(p_profile_id uuid, p_role member_role, p_division_id uuid, p_title text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_target profiles; v_div_name text;
begin
  select * into v_target from profiles where id = p_profile_id and organization_id = lf_org_id();
  if v_target.id is null then raise exception 'NOT_FOUND'; end if;
  if p_division_id is not null then
    select name into v_div_name from divisions where id = p_division_id and organization_id = lf_org_id();
    if v_div_name is null then raise exception 'NOT_FOUND'; end if;
  end if;

  if lf_role() = 'OWNER' then
    if p_profile_id = auth.uid() and p_role <> 'OWNER' then raise exception 'CANNOT_CHANGE_SELF'; end if;
    update profiles set role = p_role, division_id = p_division_id, division = v_div_name, title = nullif(trim(p_title), '')
     where id = p_profile_id;
  elsif lf_role() = 'LEADER' then
    if v_target.division_id is distinct from lf_division() or v_target.role <> 'CONSULTANT' then raise exception 'FORBIDDEN'; end if;
    if p_role <> v_target.role or p_division_id is distinct from v_target.division_id then raise exception 'FORBIDDEN'; end if;
    update profiles set title = nullif(trim(p_title), '') where id = p_profile_id;
  else
    raise exception 'FORBIDDEN';
  end if;
end $$;

create or replace function set_member_active(p_profile_id uuid, p_active boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare v_target profiles;
begin
  if p_profile_id = auth.uid() then raise exception 'CANNOT_CHANGE_SELF'; end if;
  select * into v_target from profiles where id = p_profile_id and organization_id = lf_org_id();
  if v_target.id is null then raise exception 'NOT_FOUND'; end if;
  if not (lf_role() = 'OWNER' or (lf_role() = 'LEADER' and v_target.division_id = lf_division() and v_target.role = 'CONSULTANT')) then
    raise exception 'FORBIDDEN';
  end if;
  update profiles set is_active = p_active where id = p_profile_id;
end $$;

grant select on divisions to authenticated;
grant all on divisions to service_role;
grant execute on function lf_division(), lf_claims_org(), lf_can_manage(uuid), lf_oversees(uuid, uuid, uuid),
  schedule_next_meeting(uuid, timestamptz), add_lead_note(uuid, text), set_member_profile(uuid, member_role, uuid, text),
  submit_meeting_report(uuid, meeting_outcome, reaction_level, meeting_result, next_action, date, text, text, timestamptz, text[], text[], text, timestamptz)
  to authenticated, service_role;
