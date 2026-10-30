-- =====================================================================
--  문의(Q&A) 게시판 (v1.0)
--  Supabase SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
--
--  - 로그인한(@cau.ac.kr) 회원만 문의를 쓸 수 있고, 모든 방문자가 읽을 수 있습니다.
--  - 작성자(author_id)는 화면/API 로 절대 나가지 않습니다(익명). 열 단위 권한으로 막음.
--  - 답변은 admins 표에 등록된 "운영자" 계정만 달 수 있습니다.
--
--  ⚠ 마지막 줄의 "운영자 등록"은 이메일을 바꿔서 직접 실행해야 합니다.
-- =====================================================================

create table if not exists public.inquiries (
  id          bigint generated always as identity primary key,
  author_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category    text not null check (category in ('feature','bug','other')),
  body        text not null check (char_length(body) between 5 and 1000),
  created_at  timestamptz not null default now(),
  reply       text check (reply is null or char_length(reply) between 1 and 2000),
  replied_at  timestamptz
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.inquiries enable row level security;
alter table public.admins    enable row level security;

-- ---------- 정책 ----------
drop policy if exists inquiries_select on public.inquiries;
create policy inquiries_select on public.inquiries
  for select to anon, authenticated using (true);

drop policy if exists inquiries_insert on public.inquiries;
create policy inquiries_insert on public.inquiries
  for insert to authenticated
  with check (author_id = auth.uid() and coalesce(auth.jwt() ->> 'email', '') ~* '@cau\.ac\.kr$');

drop policy if exists inquiries_admin_reply on public.inquiries;
create policy inquiries_admin_reply on public.inquiries
  for update to authenticated
  using      (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists admins_self on public.admins;
create policy admins_self on public.admins
  for select to authenticated using (user_id = auth.uid());

-- ---------- 열 단위 권한 (author_id 비공개) ----------
revoke all on public.inquiries from anon, authenticated;
revoke all on public.admins    from anon, authenticated;

grant select (id, category, body, created_at, reply, replied_at) on public.inquiries to anon, authenticated;
grant insert (category, body)                                    on public.inquiries to authenticated;
grant update (reply, replied_at)                                 on public.inquiries to authenticated;
grant select on public.admins to authenticated;

-- ---------- 운영자 등록 (이메일을 본인 @cau.ac.kr 로 바꿔서 실행) ----------
-- insert into public.admins (user_id)
--   select id from auth.users where email = 'YOUR_ID@cau.ac.kr'
--   on conflict do nothing;
