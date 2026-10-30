-- =====================================================================
--  강의평에 "학과" 열 추가 (v1.0)
--  Supabase SQL Editor 에 붙여넣고 실행. 여러 번 실행해도 안전합니다.
--
--  ★ 실행 순서
--    [1단계] 새 사이트(학과 선택 기능)를 배포하기 "전에" 아래 1단계를 실행
--            (열이 없으면 새 사이트의 강의평 목록이 안 뜹니다)
--    [2단계] 새 사이트가 배포된 것을 확인한 "뒤에" 2단계를 실행
--            (먼저 하면 옛 사이트에서 강의평 쓰기가 막힙니다)
-- =====================================================================

-- ---------- [1단계] ----------
alter table public.reviews add column if not exists department text;

alter table public.reviews drop constraint if exists reviews_department_len_chk;
alter table public.reviews add constraint reviews_department_len_chk
  check (department is null or char_length(department) between 1 and 40) not valid;

-- schema_reviews_hide_author.sql 을 이미 실행했다면 새 열도 읽을 수 있게 열어줘야 합니다.
grant select (department) on public.reviews to anon, authenticated;

-- ---------- [2단계] (새 사이트 배포 확인 후 실행) ----------
-- 학과가 있는 단과대를 고른 새 글은 학과가 반드시 있어야 저장되게 합니다.
-- alter table public.reviews drop constraint if exists reviews_department_req_chk;
-- alter table public.reviews add constraint reviews_department_req_chk
--   check (department is not null or college = '기타(교양 등)') not valid;
