export type MemberRole = "OWNER" | "MANAGER" | "CALLER" | "LEADER" | "CONSULTANT";
export type LeadStatus = "DRAFT" | "OPEN" | "ASSIGNED" | "FOLLOW_UP" | "CLOSED" | "CANCELLED";
export type MeetingMethod = "VISIT" | "PHONE" | "ONLINE";
export type MeetingOutcome = "DONE" | "POSTPONED" | "CANCELLED" | "NO_SHOW";
export type ReactionLevel = "HIGH" | "MID" | "LOW";
export type MeetingResult = "FOLLOW_UP_NEEDED" | "MATERIAL_REQUEST" | "REVISIT" | "REVIEW_THEN_CONTACT" | "HARD" | "OTHER";
export type NextAction = "CALL" | "SEND_MATERIAL" | "REVISIT" | "OWNER_CHECK" | "NONE";
export type FollowUpStatus = "PENDING" | "DONE" | "CANCELLED";

export interface Profile {
  id: string;
  organization_id: string;
  role: MemberRole;
  full_name: string;
  phone: string | null;
  division: string | null;
  is_active: boolean;
  created_at: Date;
}

export interface Organization {
  id: string;
  name: string;
  invite_code: string;
}

export interface Lead {
  id: string;
  organization_id: string;
  company_name: string;
  region: string;
  industry: string | null;
  meeting_at: Date;
  meeting_method: MeetingMethod;
  public_summary: string | null;
  status: LeadStatus;
  created_by: string;
  caller_id: string | null;
  assigned_to: string | null;
  assigned_at: Date | null;
  published_at: Date | null;
  closed_at: Date | null;
  cancel_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface LeadListItem extends Lead {
  assignee_name: string | null;
  creator_name: string | null;
  needs_report: boolean;
  pending_follow_up_date: string | null;
  pending_follow_up_action: NextAction | null;
}

export interface LeadPrivateDetails {
  lead_id: string;
  contact_name: string | null;
  contact_title: string | null;
  contact_phone: string | null;
  call_topic: string | null;
  interest_tags: string[];
  concern_tags: string[];
  contact_traits: string | null;
  meeting_reason: string | null;
  must_know: string | null;
  caution: string | null;
  extra_note: string | null;
}

export interface MeetingReport {
  id: string;
  lead_id: string;
  reporter_id: string;
  reporter_name: string;
  outcome: MeetingOutcome;
  reaction: ReactionLevel | null;
  result: MeetingResult | null;
  next_action: NextAction;
  next_action_date: string | null;
  memo: string | null;
  detail_memo: string | null;
  created_at: Date;
}

export interface FollowUp {
  id: string;
  lead_id: string;
  assignee_id: string;
  assignee_name: string;
  action: NextAction;
  due_date: string;
  status: FollowUpStatus;
  memo: string | null;
  done_note: string | null;
  created_at: Date;
  done_at: Date | null;
  company_name?: string;
  region?: string;
  lead_status?: LeadStatus;
}

export interface ActivityLog {
  id: number;
  lead_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  from_status: LeadStatus | null;
  to_status: LeadStatus | null;
  detail: Record<string, unknown>;
  created_at: Date;
  company_name?: string | null;
}

export interface Assignment {
  id: string;
  consultant_id: string;
  consultant_name: string;
  assigned_by_name: string;
  method: "CLAIM" | "MANUAL";
  status: "ACTIVE" | "RELEASED";
  released_reason: string | null;
  created_at: Date;
  released_at: Date | null;
}
