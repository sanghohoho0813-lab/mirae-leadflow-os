-- =====================================================================
-- 리드플로우 (LeadFlow) — 0001 initial schema
-- Organizations, profiles, leads (public / private split), assignments,
-- meeting reports, follow-ups, activity logs, RLS, and atomic RPCs.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums
create type member_role as enum ('OWNER', 'MANAGER', 'CALLER', 'LEADER', 'CONSULTANT');
create type lead_status as enum ('DRAFT', 'OPEN', 'ASSIGNED', 'FOLLOW_UP', 'CLOSED', 'CANCELLED');
create type meeting_method as enum ('VISIT', 'PHONE', 'ONLINE');
create type assignment_method as enum ('CLAIM', 'MANUAL');
create type assignment_status as enum ('ACTIVE', 'RELEASED');
create type meeting_outcome as enum ('DONE', 'POSTPONED', 'CANCELLED', 'NO_SHOW');
create type reaction_level as enum ('HIGH', 'MID', 'LOW');
create type meeting_result as enum ('FOLLOW_UP_NEEDED', 'MATERIAL_REQUEST', 'REVISIT', 'REVIEW_THEN_CONTACT', 'HARD', 'OTHER');
create type next_action as enum ('CALL', 'SEND_MATERIAL', 'REVISIT', 'OWNER_CHECK', 'NONE');
create type follow_up_status as enum ('PENDING', 'DONE', 'CANCELLED');

-- --------------------------------------------------------------- tables
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  role member_role not null default 'CONSULTANT',
  full_name text not null,
  phone text,
  division text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index profiles_org_idx on profiles(organization_id);

create table leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  company_name text not null,
  region text not null,
  industry text,
  meeting_at timestamptz not null,
  meeting_method meeting_method not null default 'VISIT',
  public_summary text,
  status lead_status not null default 'DRAFT',
  created_by uuid not null references profiles(id),
  caller_id uuid references profiles(id),
  assigned_to uuid references profiles(id),
  assigned_at timestamptz,
  published_at timestamptz,
  closed_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_org_status_idx on leads(organization_id, status);
create index leads_assigned_idx on leads(assigned_to);
create index leads_meeting_idx on leads(organization_id, meeting_at);

create table lead_private_details (
  lead_id uuid primary key references leads(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  contact_name text,
  contact_title text,
  contact_phone text,
  call_topic text,
  interest_tags text[] not null default '{}',
  concern_tags text[] not null default '{}',
  contact_traits text,
  meeting_reason text,
  must_know text,
  caution text,
  extra_note text,
  updated_at timestamptz not null default now()
);

create table lead_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  lead_id uuid not null references leads(id) on delete cascade,
  consultant_id uuid not null references profiles(id),
  assigned_by uuid not null references profiles(id),
  method assignment_method not null,
  status assignment_status not null default 'ACTIVE',
  released_reason text,
  created_at timestamptz not null default now(),
  released_at timestamptz
);
create index lead_assignments_lead_idx on lead_assignments(lead_id);
create unique index lead_assignments_one_active on lead_assignments(lead_id) where status = 'ACTIVE';

create table meeting_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  lead_id uuid not null references leads(id) on delete cascade,
  reporter_id uuid not null references profiles(id),
  outcome meeting_outcome not null,
  reaction reaction_level,
  result meeting_result,
  next_action next_action not null default 'NONE',
  next_action_date date,
  memo text,
  detail_memo text,
  created_at timestamptz not null default now()
);
create index meeting_reports_lead_idx on meeting_reports(lead_id);

create table follow_ups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  lead_id uuid not null references leads(id) on delete cascade,
  assignee_id uuid not null references profiles(id),
  action next_action not null,
  due_date date not null,
  status follow_up_status not null default 'PENDING',
  memo text,
  done_note text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index follow_ups_assignee_idx on follow_ups(assignee_id, status);
create index follow_ups_lead_idx on follow_ups(lead_id);

create table activity_logs (
  id bigserial primary key,
  organization_id uuid not null references organizations(id),
  lead_id uuid references leads(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null,
  from_status lead_status,
  to_status lead_status,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index activity_logs_org_idx on activity_logs(organization_id, created_at desc);
create index activity_logs_lead_idx on activity_logs(lead_id, created_at desc);

-- ------------------------------------------------------------ helpers
create or replace function lf_uid() returns uuid
language sql stable as $$ select auth.uid() $$;

create or replace function lf_org_id() returns uuid
language sql stable security definer set search_path = public as $$
  select organization_id from profiles where id = auth.uid()
$$;

create or replace function lf_role() returns member_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function lf_is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('OWNER', 'MANAGER') from profiles where id = auth.uid()), false)
$$;

create or replace function lf_log(
  p_lead_id uuid, p_action text, p_from lead_status, p_to lead_status, p_detail jsonb default '{}'
) returns void
language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select organization_id into v_org from leads where id = p_lead_id;
  insert into activity_logs(organization_id, lead_id, actor_id, action, from_status, to_status, detail)
  values (coalesce(v_org, lf_org_id()), p_lead_id, auth.uid(), p_action, p_from, p_to, coalesce(p_detail, '{}'));
end $$;

create or replace function lf_touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger leads_touch before update on leads for each row execute function lf_touch_updated_at();
create trigger lead_private_touch before update on lead_private_details for each row execute function lf_touch_updated_at();

-- ---------------------------------------------------------------- RLS
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table leads enable row level security;
alter table lead_private_details enable row level security;
alter table lead_assignments enable row level security;
alter table meeting_reports enable row level security;
alter table follow_ups enable row level security;
alter table activity_logs enable row level security;

create policy org_select on organizations for select to authenticated
  using (id = lf_org_id());

create policy profiles_select on profiles for select to authenticated
  using (organization_id = lf_org_id());
create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = lf_role() and organization_id = lf_org_id());

-- leads: managers see all; callers see all in org (avoid duplicates); consultants see published leads.
create policy leads_select on leads for select to authenticated
  using (
    organization_id = lf_org_id() and (
      lf_role() in ('OWNER', 'MANAGER', 'CALLER')
      or status in ('OPEN', 'ASSIGNED', 'FOLLOW_UP', 'CLOSED')
      or assigned_to = auth.uid()
    )
  );
create policy leads_insert on leads for insert to authenticated
  with check (
    organization_id = lf_org_id()
    and created_by = auth.uid()
    and lf_role() in ('OWNER', 'MANAGER', 'CALLER')
    and status = 'DRAFT'
  );
create policy leads_update on leads for update to authenticated
  using (
    organization_id = lf_org_id() and (
      lf_is_manager() or (lf_role() = 'CALLER' and created_by = auth.uid())
    )
  )
  with check (organization_id = lf_org_id());

create policy lead_private_select on lead_private_details for select to authenticated
  using (
    organization_id = lf_org_id() and (
      lf_is_manager()
      or exists (
        select 1 from leads l where l.id = lead_id
          and (l.assigned_to = auth.uid() or l.created_by = auth.uid())
      )
    )
  );
create policy lead_private_insert on lead_private_details for insert to authenticated
  with check (
    organization_id = lf_org_id()
    and lf_role() in ('OWNER', 'MANAGER', 'CALLER')
    and exists (select 1 from leads l where l.id = lead_id and (lf_is_manager() or l.created_by = auth.uid()))
  );
create policy lead_private_update on lead_private_details for update to authenticated
  using (
    organization_id = lf_org_id()
    and exists (select 1 from leads l where l.id = lead_id and (lf_is_manager() or l.created_by = auth.uid()))
  );

create policy assignments_select on lead_assignments for select to authenticated
  using (
    organization_id = lf_org_id() and (
      lf_role() in ('OWNER', 'MANAGER', 'CALLER') or consultant_id = auth.uid()
    )
  );

create policy reports_select on meeting_reports for select to authenticated
  using (
    organization_id = lf_org_id() and (
      lf_role() in ('OWNER', 'MANAGER', 'CALLER')
      or reporter_id = auth.uid()
      or exists (select 1 from leads l where l.id = lead_id and l.assigned_to = auth.uid())
    )
  );

create policy follow_ups_select on follow_ups for select to authenticated
  using (
    organization_id = lf_org_id() and (
      lf_role() in ('OWNER', 'MANAGER', 'CALLER') or assignee_id = auth.uid()
    )
  );

create policy logs_select on activity_logs for select to authenticated
  using (
    organization_id = lf_org_id() and (
      lf_is_manager()
      or actor_id = auth.uid()
      or exists (select 1 from leads l where l.id = lead_id and (l.assigned_to = auth.uid() or l.created_by = auth.uid()))
    )
  );

-- ---------------------------------------------------------------- RPCs
-- All state transitions go through SECURITY DEFINER functions that validate
-- role + organization explicitly and write an activity log.

create or replace function join_organization(p_invite_code text, p_full_name text, p_phone text default null)
returns profiles
language plpgsql security definer set search_path = public as $$
declare v_org organizations; v_profile profiles;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if exists (select 1 from profiles where id = auth.uid()) then raise exception 'ALREADY_MEMBER'; end if;
  select * into v_org from organizations where invite_code = upper(trim(p_invite_code));
  if v_org.id is null then raise exception 'INVALID_INVITE_CODE'; end if;
  insert into profiles(id, organization_id, role, full_name, phone)
  values (auth.uid(), v_org.id, 'CONSULTANT', trim(p_full_name), p_phone)
  returning * into v_profile;
  return v_profile;
end $$;

create or replace function create_organization(p_name text, p_full_name text, p_phone text default null)
returns profiles
language plpgsql security definer set search_path = public as $$
declare v_org organizations; v_profile profiles; v_code text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if exists (select 1 from profiles where id = auth.uid()) then raise exception 'ALREADY_MEMBER'; end if;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into organizations(name, invite_code) values (trim(p_name), v_code) returning * into v_org;
  insert into profiles(id, organization_id, role, full_name, phone)
  values (auth.uid(), v_org.id, 'OWNER', trim(p_full_name), p_phone)
  returning * into v_profile;
  return v_profile;
end $$;

create or replace function set_member_role(p_profile_id uuid, p_role member_role)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if lf_role() <> 'OWNER' then raise exception 'FORBIDDEN'; end if;
  if p_profile_id = auth.uid() then raise exception 'CANNOT_CHANGE_SELF'; end if;
  update profiles set role = p_role where id = p_profile_id and organization_id = lf_org_id();
  if not found then raise exception 'NOT_FOUND'; end if;
end $$;

create or replace function set_member_active(p_profile_id uuid, p_active boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if lf_role() <> 'OWNER' then raise exception 'FORBIDDEN'; end if;
  if p_profile_id = auth.uid() then raise exception 'CANNOT_CHANGE_SELF'; end if;
  update profiles set is_active = p_active where id = p_profile_id and organization_id = lf_org_id();
  if not found then raise exception 'NOT_FOUND'; end if;
end $$;

create or replace function publish_lead(p_lead_id uuid)
returns leads
language plpgsql security definer set search_path = public as $$
declare v_lead leads;
begin
  if not lf_is_manager() then raise exception 'FORBIDDEN'; end if;
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
declare v_lead leads;
begin
  if not lf_is_manager() then raise exception 'FORBIDDEN'; end if;
  update leads set status = 'DRAFT', published_at = null
  where id = p_lead_id and organization_id = lf_org_id() and status = 'OPEN'
  returning * into v_lead;
  if v_lead.id is null then raise exception 'INVALID_STATE'; end if;
  perform lf_log(p_lead_id, 'UNPUBLISH', 'OPEN', 'DRAFT');
  return v_lead;
end $$;

-- First-come-first-served claim. Atomic: the UPDATE's status predicate is
-- re-evaluated after the row lock, so exactly one concurrent caller wins.
create or replace function claim_lead(p_lead_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_lead leads; v_role member_role; v_uid uuid := auth.uid();
begin
  v_role := lf_role();
  if v_role is null then return jsonb_build_object('ok', false, 'code', 'NOT_MEMBER'); end if;
  if v_role not in ('CONSULTANT', 'LEADER') then return jsonb_build_object('ok', false, 'code', 'ROLE_NOT_ALLOWED'); end if;
  if not exists (select 1 from profiles where id = v_uid and is_active) then
    return jsonb_build_object('ok', false, 'code', 'INACTIVE');
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

create or replace function cancel_claim(p_lead_id uuid, p_reason text default null)
returns leads
language plpgsql security definer set search_path = public as $$
declare v_lead leads; v_uid uuid := auth.uid();
begin
  select * into v_lead from leads where id = p_lead_id and organization_id = lf_org_id();
  if v_lead.id is null then raise exception 'NOT_FOUND'; end if;
  if v_lead.assigned_to <> v_uid then raise exception 'FORBIDDEN'; end if;
  if v_lead.status <> 'ASSIGNED' then raise exception 'INVALID_STATE'; end if;
  if v_lead.meeting_at < now() then raise exception 'MEETING_PASSED'; end if;

  update leads set status = 'OPEN', assigned_to = null, assigned_at = null where id = p_lead_id returning * into v_lead;
  update lead_assignments set status = 'RELEASED', released_reason = coalesce(p_reason, '본인 신청 취소'), released_at = now()
   where lead_id = p_lead_id and status = 'ACTIVE';
  perform lf_log(p_lead_id, 'CANCEL_CLAIM', 'ASSIGNED', 'OPEN', jsonb_build_object('consultant_id', v_uid, 'reason', p_reason));
  return v_lead;
end $$;

create or replace function release_lead(p_lead_id uuid, p_reason text default null)
returns leads
language plpgsql security definer set search_path = public as $$
declare v_lead leads; v_prev uuid;
begin
  if not lf_is_manager() then raise exception 'FORBIDDEN'; end if;
  select assigned_to into v_prev from leads where id = p_lead_id and organization_id = lf_org_id() and status = 'ASSIGNED';
  if not found then raise exception 'INVALID_STATE'; end if;
  update leads set status = 'OPEN', assigned_to = null, assigned_at = null where id = p_lead_id returning * into v_lead;
  update lead_assignments set status = 'RELEASED', released_reason = coalesce(p_reason, '관리자 회수'), released_at = now()
   where lead_id = p_lead_id and status = 'ACTIVE';
  perform lf_log(p_lead_id, 'RELEASE', 'ASSIGNED', 'OPEN', jsonb_build_object('previous_consultant_id', v_prev, 'reason', p_reason));
  return v_lead;
end $$;

create or replace function reassign_lead(p_lead_id uuid, p_consultant_id uuid, p_reason text default null)
returns leads
language plpgsql security definer set search_path = public as $$
declare v_lead leads; v_prev uuid; v_from lead_status;
begin
  if not lf_is_manager() then raise exception 'FORBIDDEN'; end if;
  if not exists (
    select 1 from profiles where id = p_consultant_id and organization_id = lf_org_id() and is_active and role in ('CONSULTANT', 'LEADER')
  ) then raise exception 'INVALID_CONSULTANT'; end if;

  select assigned_to, status into v_prev, v_from from leads
   where id = p_lead_id and organization_id = lf_org_id() and status in ('OPEN', 'ASSIGNED');
  if not found then raise exception 'INVALID_STATE'; end if;
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
     and (lf_is_manager() or (lf_role() = 'CALLER' and created_by = auth.uid()) or assigned_to = auth.uid());
  if not found then raise exception 'FORBIDDEN'; end if;
  update leads set meeting_at = p_meeting_at where id = p_lead_id returning * into v_lead;
  perform lf_log(p_lead_id, 'RESCHEDULE', v_lead.status, v_lead.status,
    jsonb_build_object('from', v_old, 'to', p_meeting_at, 'reason', p_reason));
  return v_lead;
end $$;

create or replace function cancel_lead(p_lead_id uuid, p_reason text)
returns leads
language plpgsql security definer set search_path = public as $$
declare v_lead leads; v_from lead_status;
begin
  if not lf_is_manager() then raise exception 'FORBIDDEN'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then raise exception 'REASON_REQUIRED'; end if;
  select status into v_from from leads where id = p_lead_id and organization_id = lf_org_id() and status not in ('CANCELLED', 'CLOSED');
  if not found then raise exception 'INVALID_STATE'; end if;
  update leads set status = 'CANCELLED', cancel_reason = p_reason, closed_at = now() where id = p_lead_id returning * into v_lead;
  update lead_assignments set status = 'RELEASED', released_reason = 'DB 취소', released_at = now() where lead_id = p_lead_id and status = 'ACTIVE';
  update follow_ups set status = 'CANCELLED' where lead_id = p_lead_id and status = 'PENDING';
  perform lf_log(p_lead_id, 'CANCEL_LEAD', v_from, 'CANCELLED', jsonb_build_object('reason', p_reason));
  return v_lead;
end $$;

-- Click-first meeting report. Creates a follow-up when a next action exists,
-- and moves the lead to FOLLOW_UP / CLOSED / back to ASSIGNED (postponed).
create or replace function submit_meeting_report(
  p_lead_id uuid,
  p_outcome meeting_outcome,
  p_reaction reaction_level default null,
  p_result meeting_result default null,
  p_next_action next_action default 'NONE',
  p_next_action_date date default null,
  p_memo text default null,
  p_detail_memo text default null,
  p_new_meeting_at timestamptz default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_lead leads; v_uid uuid := auth.uid(); v_report_id uuid; v_follow_id uuid;
  v_to lead_status; v_assignee uuid;
begin
  select * into v_lead from leads where id = p_lead_id and organization_id = lf_org_id();
  if v_lead.id is null then raise exception 'NOT_FOUND'; end if;
  if not (lf_is_manager() or v_lead.assigned_to = v_uid) then raise exception 'FORBIDDEN'; end if;
  if v_lead.status not in ('ASSIGNED', 'FOLLOW_UP') then raise exception 'INVALID_STATE'; end if;
  if v_lead.assigned_to is null then raise exception 'NO_ASSIGNEE'; end if;
  v_assignee := v_lead.assigned_to;

  if p_outcome = 'POSTPONED' then
    if p_new_meeting_at is null then raise exception 'NEW_MEETING_REQUIRED'; end if;
  elsif p_outcome = 'DONE' then
    if p_reaction is null or p_result is null then raise exception 'REACTION_RESULT_REQUIRED'; end if;
  end if;
  if p_next_action <> 'NONE' and p_next_action_date is null then raise exception 'NEXT_DATE_REQUIRED'; end if;

  insert into meeting_reports(organization_id, lead_id, reporter_id, outcome, reaction, result, next_action, next_action_date, memo, detail_memo)
  values (v_lead.organization_id, p_lead_id, v_uid, p_outcome, p_reaction, p_result, p_next_action, p_next_action_date, nullif(trim(p_memo), ''), nullif(trim(p_detail_memo), ''))
  returning id into v_report_id;

  if p_outcome = 'POSTPONED' then
    v_to := 'ASSIGNED';
    update leads set status = 'ASSIGNED', meeting_at = p_new_meeting_at where id = p_lead_id;
    perform lf_log(p_lead_id, 'RESCHEDULE', v_lead.status, 'ASSIGNED', jsonb_build_object('from', v_lead.meeting_at, 'to', p_new_meeting_at, 'reason', '미팅 연기'));
  elsif p_next_action <> 'NONE' then
    v_to := 'FOLLOW_UP';
    update leads set status = 'FOLLOW_UP' where id = p_lead_id;
    insert into follow_ups(organization_id, lead_id, assignee_id, action, due_date, memo, created_by)
    values (v_lead.organization_id, p_lead_id, v_assignee, p_next_action, p_next_action_date, nullif(trim(p_memo), ''), v_uid)
    returning id into v_follow_id;
  else
    v_to := 'CLOSED';
    update leads set status = 'CLOSED', closed_at = now() where id = p_lead_id;
  end if;

  perform lf_log(p_lead_id, 'REPORT', v_lead.status, v_to, jsonb_build_object(
    'report_id', v_report_id, 'outcome', p_outcome, 'reaction', p_reaction, 'result', p_result,
    'next_action', p_next_action, 'next_action_date', p_next_action_date, 'follow_up_id', v_follow_id));
  return jsonb_build_object('ok', true, 'report_id', v_report_id, 'follow_up_id', v_follow_id, 'status', v_to);
end $$;

-- Complete a follow-up; optionally chain the next one or close the lead.
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
  if not (lf_is_manager() or v_fu.assignee_id = v_uid) then raise exception 'FORBIDDEN'; end if;
  if v_fu.status <> 'PENDING' then raise exception 'INVALID_STATE'; end if;
  if p_next_action <> 'NONE' and p_next_action_date is null then raise exception 'NEXT_DATE_REQUIRED'; end if;

  update follow_ups set status = 'DONE', done_note = nullif(trim(p_done_note), ''), done_at = now() where id = p_follow_up_id;
  select * into v_lead from leads where id = v_fu.lead_id;

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

-- --------------------------------------------------------------- grants
grant usage on schema public to authenticated, service_role;
grant select, insert, update on organizations, profiles, leads, lead_private_details, lead_assignments, meeting_reports, follow_ups, activity_logs to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to authenticated, service_role;
