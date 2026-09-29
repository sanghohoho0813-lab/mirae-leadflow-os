-- 0006: 교육 장소 (예: "4층").
-- 비워 두면 화면에 장소를 표시하지 않는다.
alter table trainings add column if not exists location text;
