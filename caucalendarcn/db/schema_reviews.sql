-- =====================================================================
--  CAU 강의평(reviews) 테이블 — 로그인 글쓰기 + @cau.ac.kr 제한 (v1.0)
--  Supabase SQL Editor 에 통째로 붙여넣고 실행하세요.
--  여러 번 실행해도 안전하도록 작성되어 있습니다 (idempotent).
--
--  ⚠ 실행 전 확인: Table Editor 에서 public.reviews 의 실제 컬럼 타입이
--     course_name/professor/review_text = text, credit = 정수 계열인지
--     한 번 확인해주세요. 다르면 아래 grant 구문만 맞게 조정하면 됩니다.
-- =====================================================================

-- 1. author_id 컬럼 추가 (nullable — 기존 익명 리뷰는 그대로 유지됩니다)
alter table public.reviews
  add column if not exists author_id uuid references auth.users(id) on delete set null;

-- 2. RLS 켜기
alter table public.reviews enable row level security;

-- 3. 기존 정책 교체
--    대시보드에 있던 이름("public can read reviews" / "public can insert reviews")
--    그대로 지정해서 지웁니다. 재실행 대비 새 정책 이름도 함께 drop.
drop policy if exists "public can read reviews" on public.reviews;
drop policy if exists "public can insert reviews" on public.reviews;
drop policy if exists reviews_select_public on public.reviews;
drop policy if exists reviews_insert_own on public.reviews;
drop policy if exists reviews_update_own on public.reviews;
drop policy if exists reviews_delete_own on public.reviews;

-- 읽기: 로그인 여부와 무관하게 전체 공개
--      (정책에 to 역할 지정이 없으면 기본값 PUBLIC = anon + authenticated 모두)
create policy reviews_select_public on public.reviews
  for select using (true);

-- 쓰기: 로그인한 @cau.ac.kr 사용자만, 자기 자신의 author_id로만 insert 가능
create policy reviews_insert_own on public.reviews
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and lower(coalesce(auth.jwt() ->> 'email', '')) like '%@cau.ac.kr'
  );

-- 수정/삭제: 본인 글만 (화면 UI는 아직 없지만 DB 권한은 미리 준비)
create policy reviews_update_own on public.reviews
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy reviews_delete_own on public.reviews
  for delete to authenticated
  using (author_id = auth.uid());

-- 4. 테이블 권한 (실제 접근 통제는 위의 RLS 정책이 담당)
revoke all on public.reviews from anon, authenticated;

grant select on public.reviews to anon, authenticated;
grant insert (course_name, professor, credit, review_text, author_id) on public.reviews to authenticated;
grant update (course_name, professor, credit, review_text) on public.reviews to authenticated;
grant delete on public.reviews to authenticated;

-- 레거시 익명 행(author_id is null)은 위 select 정책이 전체 공개라 그대로 보입니다.
-- 어떤 정책도 기존 행을 지우거나 숨기지 않습니다.
