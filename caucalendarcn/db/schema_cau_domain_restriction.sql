-- =====================================================================
--  @cau.ac.kr 학교 메일 전용 가입/쓰기 제한 (v1.0)
--  Supabase SQL Editor 에 통째로 붙여넣고 실행하세요.
--  여러 번 실행해도 안전하도록 작성되어 있습니다 (idempotent).
--
--  ⚠ schema_board.sql 이 이미 실행되어 있어야 합니다(이 파일은 그 정책을
--     같은 이름으로 drop 후 재생성합니다). schema_board.sql 원본은
--     건드리지 않습니다.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 가입(auth.users insert) 자체를 @cau.ac.kr 메일만 허용
--    ※ 신규 가입만 막습니다. 이미 가입된 비-@cau.ac.kr 계정은 영향받지
--      않습니다 — 정리하려면 대시보드 Authentication → Users 에서
--      직접 확인/삭제해주세요.
-- ---------------------------------------------------------------------
create or replace function public.enforce_cau_email_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null or lower(new.email) not like '%@cau.ac.kr' then
    raise exception '@cau.ac.kr 학교 이메일로만 가입할 수 있습니다. / 只能使用 @cau.ac.kr 学校邮箱注册。';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_cau_email_domain on auth.users;
create trigger enforce_cau_email_domain
  before insert on auth.users
  for each row execute function public.enforce_cau_email_domain();


-- ---------------------------------------------------------------------
-- 2. 게시판(board) 쓰기에도 동일한 이메일 제한 추가
--    schema_board.sql 의 posts_insert_own / comments_insert_own 을
--    같은 이름으로 교체(기존 author_id/is_banned 체크는 그대로 유지하고
--    이메일 도메인 체크만 추가).
--    읽기 정책(posts_select_public/comments_select_public)은 원래부터
--    to 역할 지정이 없어 anon+authenticated 모두에게 열려 있으므로
--    수정하지 않습니다.
-- ---------------------------------------------------------------------
drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own on public.posts
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and lower(coalesce(auth.jwt() ->> 'email', '')) like '%@cau.ac.kr'
    and not exists (select 1 from public.profiles where id = auth.uid() and is_banned)
  );

drop policy if exists comments_insert_own on public.comments;
create policy comments_insert_own on public.comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and lower(coalesce(auth.jwt() ->> 'email', '')) like '%@cau.ac.kr'
    and not exists (select 1 from public.profiles where id = auth.uid() and is_banned)
  );
