-- =====================================================================
--  강의평에 "수강 학기"와 "단과대학" 열 추가 (v1.0)
--  Supabase SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
--
--  - 이미 있는 옛 강의평은 학기/단과대가 비어 있어도 그대로 유지됩니다.
--  - 앞으로 새로 쓰는 강의평은 학기(예: 26-1)와 단과대가 "반드시" 있어야 저장됩니다.
--  - 새 사이트 코드(reviews.html)를 배포한 직후에 실행하세요.
--    (옛 사이트는 이 열을 보내지 않으므로, 실행 후에는 옛 코드로 글쓰기가 거부됩니다.)
-- =====================================================================

alter table public.reviews add column if not exists semester text;
alter table public.reviews add column if not exists college  text;

-- 새 글에만 적용(NOT VALID = 이미 있는 옛 글은 검사하지 않음)
alter table public.reviews drop constraint if exists reviews_semester_chk;
alter table public.reviews add constraint reviews_semester_chk
  check (semester is not null and semester ~ '^[0-9]{2}-[12]$') not valid;

alter table public.reviews drop constraint if exists reviews_college_chk;
alter table public.reviews add constraint reviews_college_chk
  check (college in (
    '인문대학','사회과학대학','사범대학','경영경제대학','적십자간호대학','자연과학대학',
    '공과대학','창의ICT공과대학','소프트웨어대학','약학대학','의과대학','예술대학',
    '생명공학대학','예술공학대학','기타(교양 등)'
  )) not valid;

-- schema_reviews_hide_author.sql 을 이미 실행했다면, 새 열도 읽을 수 있게 열어줘야 합니다.
-- (author_id 는 계속 제외)
grant select (course_name, professor, credit, review_text, created_at, semester, college)
  on public.reviews to anon, authenticated;
