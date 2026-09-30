-- 0007: 예시(샘플) DB 표시.
-- 체험용으로 넣은 DB는 is_sample = true 로 두고 화면에서 빨간 '예시' 표시를 붙인다.
-- 사람이 앱에서 등록한 DB는 기본값(false) = 실제 DB.
alter table leads add column if not exists is_sample boolean not null default false;
