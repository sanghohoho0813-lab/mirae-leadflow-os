-- =====================================================================
-- 0003 — 1인 동시 진행 한도, 직함, 상세 결과 입력, 교육 자료실
-- =====================================================================

-- ------------------------------------------------ people & org settings
-- 직함 (예: 콜팀장). Shown instead of the role name when present.
alter table profiles add column if not exists title text;

-- 한 사람이 동시에 가질 수 있는 "결과 입력 전" 미팅 수. 0 = 제한 없음.
alter table organizations add column if not exists claim_limit int not null default 1
  check (claim_limit between 0 and 20);

create or replace function set_claim_limit(p_limit int)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not lf_is_manager() then raise exception 'FORBIDDEN'; end if;
  if p_limit < 0 or p_limit > 20 then raise exception 'INVALID_LIMIT'; end if;
  update organizations set claim_limit = p_limit where id = lf_org_id();
end $$;

-- First-come-first-served claim with a per-person limit.
-- The profile row lock serialises one person's simultaneous claims, so two
-- taps on two different DBs cannot both slip under the limit.
create or replace function claim_lead(p_lead_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_lead leads; v_role member_role; v_uid uuid := auth.uid(); v_limit int; v_active int; v_active_id uuid;
begin
  v_role := lf_role();
  if v_role is null then return jsonb_build_object('ok', false, 'code', 'NOT_MEMBER'); end if;
  if v_role not in ('CONSULTANT', 'LEADER') then return jsonb_build_object('ok', false, 'code', 'ROLE_NOT_ALLOWED'); end if;
  perform 1 from profiles where id = v_uid and is_active for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'INACTIVE'); end if;

  select claim_limit into v_limit from organizations where id = lf_org_id();
  if coalesce(v_limit, 0) > 0 then
    select count(*)::int, (array_agg(id order by meeting_at))[1] into v_active, v_active_id
      from leads where assigned_to = v_uid and status = 'ASSIGNED' and id <> p_lead_id;
    if v_active >= v_limit then
      -- Same lead again is still reported as ALREADY_MINE below.
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

-- ------------------------------------------------ detailed meeting report
alter table meeting_reports add column if not exists topics text[] not null default '{}';
alter table meeting_reports add column if not exists materials text[] not null default '{}';
alter table meeting_reports add column if not exists next_note text;

drop function if exists submit_meeting_report(uuid, meeting_outcome, reaction_level, meeting_result, next_action, date, text, text, timestamptz);

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
  p_next_note text default null
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

  insert into meeting_reports(organization_id, lead_id, reporter_id, outcome, reaction, result, next_action, next_action_date,
    memo, detail_memo, topics, materials, next_note)
  values (v_lead.organization_id, p_lead_id, v_uid, p_outcome, p_reaction, p_result, p_next_action, p_next_action_date,
    nullif(trim(p_memo), ''), nullif(trim(p_detail_memo), ''), coalesce(p_topics, '{}'), coalesce(p_materials, '{}'), nullif(trim(p_next_note), ''))
  returning id into v_report_id;

  if p_outcome = 'POSTPONED' then
    v_to := 'ASSIGNED';
    update leads set status = 'ASSIGNED', meeting_at = p_new_meeting_at where id = p_lead_id;
    perform lf_log(p_lead_id, 'RESCHEDULE', v_lead.status, 'ASSIGNED', jsonb_build_object('from', v_lead.meeting_at, 'to', p_new_meeting_at, 'reason', '미팅 연기'));
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
    'report_id', v_report_id, 'outcome', p_outcome, 'reaction', p_reaction, 'result', p_result,
    'next_action', p_next_action, 'next_action_date', p_next_action_date, 'follow_up_id', v_follow_id));
  return jsonb_build_object('ok', true, 'report_id', v_report_id, 'follow_up_id', v_follow_id, 'status', v_to);
end $$;

-- ------------------------------------------------------ 교육 자료실
create table if not exists trainings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  title text not null,
  held_at timestamptz not null,
  instructor_id uuid references profiles(id),
  instructor_name text,
  content text,                          -- 강의 메모 · 녹취록 · 자료 텍스트 (AI 정리 재료)
  links jsonb not null default '[]',     -- [{label, url}]
  summary jsonb,                         -- {one_line, key_points[], action_items[], talk_tracks[], keywords[]}
  summary_source text check (summary_source in ('AI', 'BASIC', 'MANUAL')),
  summarized_at timestamptz,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trainings_org_held_idx on trainings(organization_id, held_at desc);
create trigger trainings_touch before update on trainings for each row execute function lf_touch_updated_at();

create table if not exists training_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  training_id uuid not null references trainings(id) on delete cascade,
  name text not null,
  mime text not null default 'application/octet-stream',
  size int not null check (size > 0),
  chunk_count int not null check (chunk_count between 1 and 64),
  complete boolean not null default false,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists training_files_training_idx on training_files(training_id);

create table if not exists training_file_chunks (
  file_id uuid not null references training_files(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  idx int not null,
  data bytea not null,
  primary key (file_id, idx)
);

create table if not exists training_reads (
  training_id uuid not null references trainings(id) on delete cascade,
  profile_id uuid not null references profiles(id),
  organization_id uuid not null references organizations(id),
  read_at timestamptz not null default now(),
  primary key (training_id, profile_id)
);

-- Who may publish trainings: 단장·운영 and 본부장 (수요일 교육 진행).
create or replace function lf_can_teach() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('OWNER', 'MANAGER', 'LEADER') and is_active from profiles where id = auth.uid()), false)
$$;

alter table trainings enable row level security;
alter table training_files enable row level security;
alter table training_file_chunks enable row level security;
alter table training_reads enable row level security;

create policy trainings_select on trainings for select to authenticated
  using (organization_id = lf_org_id());
create policy trainings_insert on trainings for insert to authenticated
  with check (organization_id = lf_org_id() and created_by = auth.uid() and lf_can_teach());
create policy trainings_update on trainings for update to authenticated
  using (organization_id = lf_org_id() and lf_can_teach() and (lf_is_manager() or created_by = auth.uid() or instructor_id = auth.uid()))
  with check (organization_id = lf_org_id());
create policy trainings_delete on trainings for delete to authenticated
  using (organization_id = lf_org_id() and (lf_is_manager() or created_by = auth.uid()));

create policy training_files_select on training_files for select to authenticated
  using (organization_id = lf_org_id());
create policy training_files_insert on training_files for insert to authenticated
  with check (organization_id = lf_org_id() and created_by = auth.uid() and lf_can_teach()
    and exists (select 1 from trainings t where t.id = training_id and t.organization_id = lf_org_id()));
create policy training_files_update on training_files for update to authenticated
  using (organization_id = lf_org_id() and created_by = auth.uid());
create policy training_files_delete on training_files for delete to authenticated
  using (organization_id = lf_org_id() and (lf_is_manager() or created_by = auth.uid()));

create policy training_chunks_select on training_file_chunks for select to authenticated
  using (organization_id = lf_org_id());
create policy training_chunks_insert on training_file_chunks for insert to authenticated
  with check (organization_id = lf_org_id()
    and exists (select 1 from training_files f where f.id = file_id and f.created_by = auth.uid() and not f.complete and idx < f.chunk_count));

create policy training_reads_select on training_reads for select to authenticated
  using (organization_id = lf_org_id());
create policy training_reads_insert on training_reads for insert to authenticated
  with check (organization_id = lf_org_id() and profile_id = auth.uid());

grant select, insert, update, delete on trainings, training_files, training_file_chunks, training_reads to authenticated;
grant all on trainings, training_files, training_file_chunks, training_reads to service_role;
grant execute on function set_claim_limit(int), lf_can_teach(), submit_meeting_report(uuid, meeting_outcome, reaction_level, meeting_result, next_action, date, text, text, timestamptz, text[], text[], text) to authenticated, service_role;
