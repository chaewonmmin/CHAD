-- =====================================================================
--  CAU 中国留学生社区 · 게시판 스키마 (v1.0)
--  Supabase SQL Editor 에 통째로 붙여넣고 실행하세요.
--  여러 번 실행해도 안전하도록 작성되어 있습니다 (idempotent).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. profiles : 회원 프로필 (auth.users 와 1:1)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nickname   text not null unique
             check (char_length(nickname) between 2 and 12),
  is_banned  boolean not null default false,
  created_at timestamptz not null default now()
);

-- 가입 시 닉네임(user_metadata)으로 프로필 자동 생성.
-- 닉네임이 중복이면 뒤에 숫자를 붙여 재시도하므로 가입 자체는 실패하지 않습니다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_nick text;
  try_nick  text;
  i         int := 0;
begin
  base_nick := coalesce(nullif(trim(new.raw_user_meta_data->>'nickname'), ''),
                        '用户' || substr(replace(new.id::text, '-', ''), 1, 6));
  base_nick := left(base_nick, 12);
  try_nick  := base_nick;

  loop
    begin
      insert into public.profiles (id, nickname) values (new.id, try_nick);
      exit;
    exception
      when unique_violation then
        i := i + 1;
        if i > 50 then
          -- 극단적인 경우: 랜덤 닉네임으로 확정
          insert into public.profiles (id, nickname)
          values (new.id, left('用户' || substr(md5(random()::text), 1, 8), 12));
          exit;
        end if;
        try_nick := left(base_nick, 12 - length(i::text)) || i::text;
    end;
  end loop;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------
-- 2. posts : 게시글
-- ---------------------------------------------------------------------
create table if not exists public.posts (
  id            bigint generated always as identity primary key,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 100),
  body          text not null check (char_length(body)  between 1 and 5000),
  is_anonymous  boolean not null default true,
  like_count    int not null default 0,
  comment_count int not null default 0,
  report_count  int not null default 0,
  is_hidden     boolean not null default false,  -- 신고 누적 시 자동 숨김
  is_deleted    boolean not null default false,  -- 작성자 삭제 (soft delete)
  created_at    timestamptz not null default now()
);

create index if not exists posts_feed_idx
  on public.posts (created_at desc)
  where not is_deleted and not is_hidden;

create index if not exists posts_author_idx on public.posts (author_id);


-- ---------------------------------------------------------------------
-- 3. comments : 댓글 (게시글별 익명 번호 자동 부여)
--    anon_no = 0  -> 글쓴이(작성자 본인)
--    anon_no = 1..N -> 匿名1, 匿名2 ... (같은 사람은 같은 번호 유지)
-- ---------------------------------------------------------------------
create table if not exists public.comments (
  id           bigint generated always as identity primary key,
  post_id      bigint not null references public.posts(id) on delete cascade,
  author_id    uuid   not null references public.profiles(id) on delete cascade,
  body         text   not null check (char_length(body) between 1 and 1000),
  is_anonymous boolean not null default true,
  anon_no      int    not null default 0,
  report_count int    not null default 0,
  is_hidden    boolean not null default false,
  is_deleted   boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists comments_post_idx on public.comments (post_id, created_at);

create or replace function public.assign_anon_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
  existing_no int;
begin
  select author_id into post_author from public.posts where id = new.post_id;

  if post_author = new.author_id then
    new.anon_no := 0;                       -- 글쓴이
    return new;
  end if;

  select anon_no into existing_no
    from public.comments
   where post_id = new.post_id
     and author_id = new.author_id
     and anon_no > 0
   limit 1;

  if existing_no is not null then
    new.anon_no := existing_no;             -- 같은 사람 = 같은 번호
  else
    select coalesce(max(anon_no), 0) + 1 into new.anon_no
      from public.comments where post_id = new.post_id;
  end if;

  return new;
end;
$$;

drop trigger if exists comments_assign_anon_no on public.comments;
create trigger comments_assign_anon_no
  before insert on public.comments
  for each row execute function public.assign_anon_no();

-- 댓글 수 카운터
create or replace function public.sync_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  elsif tg_op = 'UPDATE' and old.is_deleted is distinct from new.is_deleted then
    update public.posts
       set comment_count = greatest(comment_count + case when new.is_deleted then -1 else 1 end, 0)
     where id = new.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists comments_sync_count on public.comments;
create trigger comments_sync_count
  after insert or delete or update of is_deleted on public.comments
  for each row execute function public.sync_comment_count();


-- ---------------------------------------------------------------------
-- 4. post_likes : 공감
-- ---------------------------------------------------------------------
create table if not exists public.post_likes (
  post_id    bigint not null references public.posts(id) on delete cascade,
  user_id    uuid   not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create or replace function public.sync_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  else
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists post_likes_sync_count on public.post_likes;
create trigger post_likes_sync_count
  after insert or delete on public.post_likes
  for each row execute function public.sync_like_count();


-- ---------------------------------------------------------------------
-- 5. reports : 신고 (누적 5회 -> 자동 숨김)
--    ※ 익명 게시판 운영자는 명예훼손·불법정보 게시물에 대한 조치 의무가 있습니다.
-- ---------------------------------------------------------------------
create table if not exists public.reports (
  id          bigint generated always as identity primary key,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id   bigint not null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason      text,
  created_at  timestamptz not null default now(),
  unique (target_type, target_id, reporter_id)
);

create or replace function public.apply_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  threshold constant int := 5;
begin
  if new.target_type = 'post' then
    update public.posts
       set report_count = report_count + 1,
           is_hidden = (report_count + 1 >= threshold)
     where id = new.target_id;
  else
    update public.comments
       set report_count = report_count + 1,
           is_hidden = (report_count + 1 >= threshold)
     where id = new.target_id;
  end if;
  return null;
end;
$$;

drop trigger if exists reports_apply on public.reports;
create trigger reports_apply
  after insert on public.reports
  for each row execute function public.apply_report();


-- ---------------------------------------------------------------------
-- 6. 공개 뷰 : author_id 를 절대 클라이언트로 내보내지 않습니다.
--    (익명 글 두 개의 author_id 가 같으면 동일인이라는 사실이 노출되므로)
-- ---------------------------------------------------------------------
drop view if exists public.posts_public;
create view public.posts_public
with (security_invoker = false, security_barrier = true) as
select
  p.id,
  p.title,
  p.body,
  p.is_anonymous,
  case when p.is_anonymous then null else pr.nickname end as nickname,
  p.like_count,
  p.comment_count,
  p.created_at,
  (p.author_id = auth.uid()) as is_mine
from public.posts p
join public.profiles pr on pr.id = p.author_id
where not p.is_deleted and not p.is_hidden;

drop view if exists public.comments_public;
create view public.comments_public
with (security_invoker = false, security_barrier = true) as
select
  c.id,
  c.post_id,
  c.body,
  c.is_anonymous,
  case when c.is_anonymous then null else pr.nickname end as nickname,
  c.anon_no,
  (c.anon_no = 0) as is_op,
  c.created_at,
  (c.author_id = auth.uid()) as is_mine
from public.comments c
join public.profiles pr on pr.id = c.author_id
where not c.is_deleted and not c.is_hidden;

grant select on public.posts_public    to anon, authenticated;
grant select on public.comments_public to anon, authenticated;


-- ---------------------------------------------------------------------
-- 7. RLS 정책
-- ---------------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.posts      enable row level security;
alter table public.comments   enable row level security;
alter table public.post_likes enable row level security;
alter table public.reports    enable row level security;

-- profiles ------------------------------------------------------------
-- 닉네임/가입일만 들어있는 테이블입니다. 이메일·비밀번호는 auth.users 에만
-- 저장되고 클라이언트에서 접근할 수 없으므로 닉네임 공개 조회를 허용합니다.
drop policy if exists profiles_select_self on public.profiles;
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
  for select using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- posts ---------------------------------------------------------------
drop policy if exists posts_select_public on public.posts;
create policy posts_select_public on public.posts
  for select using (not is_deleted and not is_hidden);

-- 삭제는 is_deleted = true 로 바꾸는 update 입니다. Postgres 는 update 후의 행도
-- select 정책을 통과해야 하므로, 작성자는 자기 행을 계속 볼 수 있어야 합니다.
-- 공개 목록은 posts_public 뷰의 where 조건이 따로 걸러줍니다.
drop policy if exists posts_select_own on public.posts;
create policy posts_select_own on public.posts
  for select to authenticated using (author_id = auth.uid());

drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own on public.posts
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and not exists (select 1 from public.profiles where id = auth.uid() and is_banned)
  );

drop policy if exists posts_update_own on public.posts;
create policy posts_update_own on public.posts
  for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

-- comments ------------------------------------------------------------
drop policy if exists comments_select_public on public.comments;
create policy comments_select_public on public.comments
  for select using (not is_deleted and not is_hidden);

-- 삭제는 is_deleted = true 로 바꾸는 update 입니다. Postgres 는 update 후의 행도
-- select 정책을 통과해야 하므로, 작성자는 자기 행을 계속 볼 수 있어야 합니다.
-- 공개 목록은 comments_public 뷰의 where 조건이 따로 걸러줍니다.
drop policy if exists comments_select_own on public.comments;
create policy comments_select_own on public.comments
  for select to authenticated using (author_id = auth.uid());

drop policy if exists comments_insert_own on public.comments;
create policy comments_insert_own on public.comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and not exists (select 1 from public.profiles where id = auth.uid() and is_banned)
  );

drop policy if exists comments_update_own on public.comments;
create policy comments_update_own on public.comments
  for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

-- post_likes ----------------------------------------------------------
-- 본인이 누른 공감만 조회 가능 (누가 눌렀는지 목록은 노출되지 않음)
drop policy if exists likes_select_own on public.post_likes;
create policy likes_select_own on public.post_likes
  for select to authenticated using (user_id = auth.uid());

drop policy if exists likes_insert_own on public.post_likes;
create policy likes_insert_own on public.post_likes
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists likes_delete_own on public.post_likes;
create policy likes_delete_own on public.post_likes
  for delete to authenticated using (user_id = auth.uid());

-- reports -------------------------------------------------------------
-- 신고는 넣을 수만 있고, 조회는 불가 (관리자는 service_role 로 확인)
drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());


-- ---------------------------------------------------------------------
-- 8. 테이블 권한 (실제 접근 통제는 위의 RLS 정책이 담당합니다)
-- ---------------------------------------------------------------------
-- Supabase 는 기본적으로 anon/authenticated 에 전체 권한을 부여하므로 먼저 회수합니다.
revoke all on public.profiles        from anon, authenticated;
revoke all on public.posts           from anon, authenticated;
revoke all on public.comments        from anon, authenticated;
revoke all on public.post_likes      from anon, authenticated;
revoke all on public.reports         from anon, authenticated;
revoke all on public.posts_public    from anon, authenticated;
revoke all on public.comments_public from anon, authenticated;

grant select on public.posts_public    to anon, authenticated;
grant select on public.comments_public to anon, authenticated;

-- 컬럼 단위로 권한을 제한합니다. like_count / report_count / is_hidden 같은
-- 시스템 컬럼은 작성자 본인도 직접 수정할 수 없습니다 (신고 회피 방지).
grant select on public.profiles to anon, authenticated;
grant update (nickname) on public.profiles to authenticated;

grant select (id) on public.posts to authenticated;
grant insert (author_id, title, body, is_anonymous) on public.posts to authenticated;
grant update (title, body, is_anonymous, is_deleted) on public.posts to authenticated;

grant select (id) on public.comments to authenticated;
grant insert (post_id, author_id, body, is_anonymous) on public.comments to authenticated;
grant update (body, is_deleted) on public.comments to authenticated;

grant select, delete on public.post_likes to authenticated;
grant insert (post_id, user_id) on public.post_likes to authenticated;

grant insert (target_type, target_id, reporter_id, reason) on public.reports to authenticated;
