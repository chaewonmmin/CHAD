-- =====================================================================
--  강의평 작성자(author_id) 비공개 처리 (v1.0)
--  Supabase SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
--
--  ⚠ 반드시 "새 사이트 코드(reviews.html: select 에 컬럼을 직접 지정)"가
--     배포된 뒤에 실행하세요. 옛 코드는 select("*") 를 쓰므로, 이 SQL 을 먼저
--     실행하면 옛 사이트에서 강의평 목록이 에러로 안 보입니다.
--
--  효과: 누구나(로그인 안 한 사람 포함) API 로 reviews 를 읽어도
--        author_id 열은 읽을 수 없게 됩니다 → 강의평 작성자끼리 연결해서
--        볼 수 없음. (RLS 정책은 그대로, 열 단위 권한만 줄입니다.)
--
--  되돌리려면:  grant select on public.reviews to anon, authenticated;
-- =====================================================================

revoke select on public.reviews from anon, authenticated;

--  (semester, college 열은 schema_reviews_filters.sql 을 먼저 실행해서 만든 뒤에 이 파일을 실행하세요)
grant select (course_name, professor, credit, review_text, created_at, semester, college)
  on public.reviews to anon, authenticated;

-- 확인용(결과가 author_id 를 제외한 열만 나오면 정상):
-- select column_name from information_schema.column_privileges
--  where table_name = 'reviews' and grantee = 'anon' and privilege_type = 'SELECT';
