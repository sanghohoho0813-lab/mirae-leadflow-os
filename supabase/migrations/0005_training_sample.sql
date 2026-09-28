-- 0005: 예시(샘플) 교육 표시.
-- 체험용으로 넣어 둔 교육은 is_sample = true 로 두고 화면에서 '예시'로 구분한다.
-- 사람이 앱에서 올리는 교육은 기본값(false) = 실제 교육.
alter table trainings add column if not exists is_sample boolean not null default false;
