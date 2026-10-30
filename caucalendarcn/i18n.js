// 공용 언어 전환(中文 / 한국어) — 모든 페이지가 공유한다.
// 사용법
//  - 정적 문구:  <span data-i18n="키"></span>   (textContent 교체)
//               data-i18n-html="키"  (줄바꿈 <br> 이 필요한 고정 문구용, 사전에 있는 값만 들어감)
//               data-i18n-ph="키"    (placeholder),  data-i18n-aria="키"  (aria-label)
//  - 동적 문구:  I18N.t("키", 인자...)   /   언어가 바뀔 때 다시 그리려면 I18N.onChange(fn)
//  - 선택한 언어는 localStorage("cau_lang")에 저장된다. 기본값은 中文.
// 사용자가 쓴 글(게시글·댓글·강의평 본문)은 번역하지 않고 그대로 보여준다.
window.I18N = (function () {
  "use strict";

  const STORE_KEY = "cau_lang";

  const D = {
    zh: {
      // ---- 공통 ----
      brand_name: "中国留学生",
      tab_cal: "日历", tab_rev: "点评", tab_board: "广场",
      login: "登录", logout: "退出", close: "关闭", cancel: "取消",
      loading: "加载中…",
      lang_btn: "한국어",
      lang_aria: "切换为韩语",

      // ---- 학사일정 ----
      title_cal: "学期日历 · CAU 中国留学生",
      cal_eyebrow: "2026年秋季学期",
      cal_h1: "学期日历",
      cal_sub: "整理自学校官方学事日程,按时间顺序列出选课、缴费、考试等重要日期。点击日期查看详情,可一键添加到 Google 日历。",
      cal_disclaimer: "⚠ 以上日期整理自学校官方《2026학년도 신입생 학사가이드》,但学期中若有变更以综合信息系统(포털)最新公告为准,请定期核对。",
      cal_prev: "上个月", cal_next: "下个月", cal_today: "回到今天",
      cal_hint: "点击日期查看当天安排",
      cal_none: "这一天没有安排",
      cal_footer: "本页面为独立静态页面,数据全部保存在浏览器本地生成,不会上传或收集任何个人信息。在日程详情中可一键添加到 Google 日历。",
      cal_add_google: "+ Google 日历",
      cal_year: (y) => y + "年",
      cal_month: (m) => m + "月",
      cal_title: (y, m) => y + "年" + m + "月",
      cal_aria_prev: "上个月", cal_aria_next: "下个月",
      weekdays: ["日", "一", "二", "三", "四", "五", "六"],
      "tag_选课": "选课", "tag_缴费": "缴费", "tag_考试": "考试",
      "tag_假期": "假期", "tag_截止": "截止", "tag_学期": "学期",

      // ---- 강의평 ----
      title_rev: "课程点评 · CAU 中国留学生",
      rev_eyebrow: "中国留学生课程点评",
      rev_h1: "课程点评",
      rev_sub: "写下你上过的课程名、教授和学分,以及真实的课程评价,所有同学都能看到。",
      rev_write: "+ 写点评",
      rev_course: "课程名称", rev_prof: "教授", rev_credit: "学分", rev_text: "点评内容",
      rev_submit: "提交", rev_submitting: "提交中…",
      rev_fail: "提交失败,请重试。",
      rev_err_course: "请填写课程名称。",
      rev_err_prof: "请填写教授姓名。",
      rev_err_credit: "学分请输入 0~12 的数字。",
      rev_err_text: "点评内容至少 5 个字。",
      rev_empty: "暂无点评,快来添加第一条吧。",
      rev_load_fail: "加载失败,请刷新页面重试。",
      rev_credit_badge: (n) => n + "学分",
      rev_search_ph: "搜索课程名、教授、点评内容",
      rev_search_aria: "搜索点评",
      rev_count: (n, total) => (n === total ? "共 " + total + " 条点评" : "找到 " + n + " 条(共 " + total + " 条)"),
      rev_nomatch: "没有找到相关点评。换个关键词试试?",
      rev_semester: "修读学期", rev_college: "开课学院",
      rev_select_ph: "请选择",
      rev_err_semester: "请选择修读学期。",
      rev_err_college: "请选择开课学院。",
      rev_all_semester: "全部学期", rev_all_college: "全部学院",
      rev_term: (s) => s + "学期",
      rev_reset: "重置筛选",
      rev_footer: "本页面的点评内容将保存在服务器(Supabase)中,所有访客可见,请勿填写真实姓名或敏感信息。",
      cfg_lib_fail: "无法加载数据库组件,请检查网络后刷新。",

      // ---- 문의(Q&A) ----
      qna_link: "意见反馈 · 问答",
      title_qna: "意见反馈 · CAU 中国留学生",
      qna_eyebrow: "意见反馈 · 问答",
      qna_h1: "意见反馈",
      qna_sub: "对网站有建议、发现错误或有疑问,都可以在这里留言,运营者会回复。所有留言均为匿名,所有人可见。",
      qna_write: "+ 留言",
      qna_category: "类型",
      qna_cat_feature: "功能建议", qna_cat_bug: "错误反馈", qna_cat_other: "其他",
      qna_body: "内容",
      qna_body_ph: "请具体描述(至少 5 个字)",
      qna_err_body: "内容至少 5 个字。",
      qna_err_cat: "请选择类型。",
      qna_submit: "提交", qna_submitting: "提交中…",
      qna_fail: "提交失败,请重试。",
      qna_empty: "还没有留言,来写第一条吧。",
      qna_waiting: "等待回复",
      qna_answer: "运营者回复",
      qna_reply_ph: "写下回复…",
      qna_reply_btn: "回复", qna_reply_edit: "修改回复",
      qna_footer: "留言将保存在服务器(Supabase)并对所有访客公开,请勿填写真实姓名或敏感信息。",

      // ---- 게시판 ----
      title_board: "广场 · CAU 中国留学生",
      board_h1: "广场",
      refresh: "刷新", write_post: "写帖子",
      title_ph: "标题", body_ph: "请勿填写他人真实姓名、联系方式等个人信息。",
      anon: "匿名",
      publish: "发布", publishing: "发布中…",
      err_title: "请填写标题。", err_body: "请填写内容。",
      post_fail: "发布失败:",
      more: "加载更多",
      empty_posts: "还没有帖子,来发第一条吧",
      load_fail: "加载失败:",
      back: "← 返回",
      post_gone: "帖子不存在或已被删除。",
      like: "共鸣", report: "举报", del: "删除",
      comments: "评论",
      comment_ph: "写评论…",
      comment_send: "发送", comment_sending: "发送中…",
      comment_fail: "发送失败:",
      err_comment: "请填写评论内容。",
      no_comments: "还没有评论,来写第一条吧",
      comment_login_prompt: "登录后才能发表评论",
      confirm_del_post: "确定要删除这条帖子吗?",
      confirm_del_comment: "删除这条评论?",
      del_fail: "删除失败:",
      report_prompt: "举报理由(选填)",
      report_dup: "您已举报过该内容。",
      report_fail: "举报失败:",
      report_ok: "已收到举报。",
      anon_plain: "匿名", anon_me: "匿名(我)", anon_n: (n) => "匿名" + n, op: "楼主",
      badge_me: "我", badge_anon: "匿",
      ago_now: "刚刚",
      ago_min: (n) => n + "分钟前", ago_hour: (n) => n + "小时前", ago_day: (n) => n + "天前",
      board_footer: "禁止人身攻击、辱骂、歧视、广告及涉及他人隐私的内容。被举报 5 次以上自动隐藏。<br />帖子内容的法律责任由作者本人承担。· CAU 中国留学生社区",

      // ---- 로그인 모달 ----
      auth_login_title: "登录", auth_signup_title: "注册", auth_verify_title: "验证邮箱",
      auth_nick: "昵称(2~12 个字符)",
      auth_email: "邮箱(学校邮箱 @cau.ac.kr)",
      auth_pw: "密码(至少 6 位)",
      auth_code: "验证码(邮箱收到的数字)",
      auth_btn_login: "登录", auth_btn_signup: "注册", auth_btn_verify: "确认",
      auth_no_account: "还没有账号?", auth_has_account: "已有账号?",
      auth_go_signup: "注册", auth_go_login: "登录",
      auth_resend: "重新发送验证码",
      auth_processing: "处理中…", auth_verifying: "验证中…",
      auth_need_both: "请填写邮箱和密码。",
      auth_domain: "请使用学校邮箱(@cau.ac.kr)注册。",
      auth_nick_len: "昵称需为 2~12 个字符。",
      auth_pw_len: "密码至少 6 位。",
      auth_code_sent: "验证码已发送,请查收邮箱(如未收到请查看垃圾邮件)。",
      auth_need_code: "请输入验证码。",
      auth_bad_login: "邮箱或密码不正确。",
      auth_registered: "该邮箱已注册,请直接登录。",
      auth_rate: "请求过于频繁,请稍后再试。",
      auth_bad_code: "验证码错误或已过期。",
      auth_resent: "已重新发送验证码。",
      auth_resend_fail: "发送失败:",
    },

    ko: {
      // ---- 공통 ----
      brand_name: "중국인 유학생",
      tab_cal: "학사일정", tab_rev: "강의평", tab_board: "게시판",
      login: "로그인", logout: "로그아웃", close: "닫기", cancel: "취소",
      loading: "불러오는 중…",
      lang_btn: "中文",
      lang_aria: "중국어로 전환",

      // ---- 학사일정 ----
      title_cal: "학사일정 · CAU 중국인 유학생",
      cal_eyebrow: "2026학년도 2학기",
      cal_h1: "학사일정",
      cal_sub: "학교 공식 학사일정을 날짜순으로 정리했어요. 수강신청·등록금 납부·시험 등 주요 일정을 날짜를 눌러 확인하고, Google 캘린더에 바로 추가할 수 있습니다.",
      cal_disclaimer: "⚠ 위 일정은 학교 공식 「2026학년도 신입생 학사가이드」를 바탕으로 정리했습니다. 학기 중 변경될 수 있으니 종합정보시스템(포털)의 최신 공지를 꼭 확인하세요.",
      cal_prev: "이전 달", cal_next: "다음 달", cal_today: "오늘로",
      cal_hint: "날짜를 누르면 그날 일정이 표시됩니다.",
      cal_none: "이 날은 일정이 없습니다.",
      cal_footer: "이 페이지의 일정 데이터는 브라우저에서만 생성되며, 개인정보를 수집하거나 서버로 전송하지 않습니다. 일정 상세에서 Google 캘린더에 바로 추가할 수 있습니다.",
      cal_add_google: "+ Google 캘린더",
      cal_year: (y) => y + "년",
      cal_month: (m) => m + "월",
      cal_title: (y, m) => y + "년 " + m + "월",
      cal_aria_prev: "이전 달", cal_aria_next: "다음 달",
      weekdays: ["일", "월", "화", "수", "목", "금", "토"],
      "tag_选课": "수강신청", "tag_缴费": "등록금", "tag_考试": "시험",
      "tag_假期": "방학·휴일", "tag_截止": "마감", "tag_学期": "학기",

      // ---- 강의평 ----
      title_rev: "강의평 · CAU 중국인 유학생",
      rev_eyebrow: "중국인 유학생 강의평",
      rev_h1: "강의평 게시판",
      rev_sub: "수강했던 강의의 강의명·교수님·학점과 함께 솔직한 강의평을 남겨주세요. 모든 회원이 함께 볼 수 있는 공유 게시판입니다.",
      rev_write: "+ 리뷰 작성",
      rev_course: "강의명", rev_prof: "교수님", rev_credit: "학점", rev_text: "강의평",
      rev_submit: "등록하기", rev_submitting: "제출 중…",
      rev_fail: "제출에 실패했습니다. 다시 시도해주세요.",
      rev_err_course: "강의명을 입력해주세요.",
      rev_err_prof: "교수님 성함을 입력해주세요.",
      rev_err_credit: "학점은 0~12 사이의 숫자로 입력해주세요.",
      rev_err_text: "강의평을 5자 이상 입력해주세요.",
      rev_empty: "아직 등록된 강의평이 없습니다. 첫 번째 강의평을 남겨보세요!",
      rev_load_fail: "불러오기에 실패했습니다. 새로고침 후 다시 시도해주세요.",
      rev_credit_badge: (n) => n + "학점",
      rev_search_ph: "강의명·교수님·내용 검색",
      rev_search_aria: "강의평 검색",
      rev_count: (n, total) => (n === total ? "강의평 총 " + total + "개" : "검색 결과 " + n + "개 (전체 " + total + "개)"),
      rev_nomatch: "검색 결과가 없습니다. 다른 검색어로 시도해보세요.",
      rev_semester: "수강 학기", rev_college: "단과대학",
      rev_select_ph: "선택해주세요",
      rev_err_semester: "수강 학기를 선택해주세요.",
      rev_err_college: "단과대학을 선택해주세요.",
      rev_all_semester: "전체 학기", rev_all_college: "전체 단과대학",
      rev_term: (s) => s + "학기",
      rev_reset: "필터 초기화",
      rev_footer: "이 페이지에 작성한 강의평은 Supabase 데이터베이스에 저장되어 모든 방문자에게 공개됩니다. 실명이나 민감한 개인정보는 남기지 말아주세요.",
      cfg_lib_fail: "라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침 해주세요.",

      // ---- 문의(Q&A) ----
      qna_link: "문의 · 건의하기",
      title_qna: "문의 · 건의 · CAU 중국 유학생",
      qna_eyebrow: "문의 · 건의",
      qna_h1: "문의 · 건의 게시판",
      qna_sub: "사이트에 대한 건의, 오류 제보, 궁금한 점을 남겨주세요. 운영자가 답변드립니다. 모든 글은 익명이며 누구나 볼 수 있습니다.",
      qna_write: "+ 문의하기",
      qna_category: "유형",
      qna_cat_feature: "기능 건의", qna_cat_bug: "오류 제보", qna_cat_other: "기타",
      qna_body: "내용",
      qna_body_ph: "구체적으로 적어주세요 (5자 이상)",
      qna_err_body: "내용을 5자 이상 입력해주세요.",
      qna_err_cat: "유형을 선택해주세요.",
      qna_submit: "등록하기", qna_submitting: "제출 중…",
      qna_fail: "제출에 실패했습니다. 다시 시도해주세요.",
      qna_empty: "아직 문의가 없습니다. 첫 번째 문의를 남겨보세요!",
      qna_waiting: "답변 대기 중",
      qna_answer: "운영자 답변",
      qna_reply_ph: "답변을 입력하세요…",
      qna_reply_btn: "답변 등록", qna_reply_edit: "답변 수정",
      qna_footer: "작성한 글은 Supabase 데이터베이스에 저장되어 모든 방문자에게 공개됩니다. 실명이나 민감한 개인정보는 남기지 말아주세요.",

      // ---- 게시판 ----
      title_board: "게시판 · CAU 중국인 유학생",
      board_h1: "자유게시판",
      refresh: "새로고침", write_post: "글쓰기",
      title_ph: "제목", body_ph: "타인의 실명·연락처 등 개인정보는 작성하지 마세요.",
      anon: "익명",
      publish: "등록", publishing: "등록 중…",
      err_title: "제목을 입력해주세요.", err_body: "내용을 입력해주세요.",
      post_fail: "등록 실패: ",
      more: "더 보기",
      empty_posts: "아직 글이 없습니다. 첫 글을 남겨보세요",
      load_fail: "불러오기 실패: ",
      back: "← 목록",
      post_gone: "삭제되었거나 없는 글입니다.",
      like: "공감", report: "신고", del: "삭제",
      comments: "댓글",
      comment_ph: "댓글을 입력하세요…",
      comment_send: "등록", comment_sending: "등록 중…",
      comment_fail: "등록 실패: ",
      err_comment: "댓글 내용을 입력해주세요.",
      no_comments: "아직 댓글이 없습니다. 첫 댓글을 남겨보세요",
      comment_login_prompt: "로그인 후 댓글을 작성할 수 있어요",
      confirm_del_post: "이 글을 삭제할까요?",
      confirm_del_comment: "이 댓글을 삭제할까요?",
      del_fail: "삭제 실패: ",
      report_prompt: "신고 사유 (선택)",
      report_dup: "이미 신고한 내용입니다.",
      report_fail: "신고 실패: ",
      report_ok: "신고가 접수되었습니다.",
      anon_plain: "익명", anon_me: "익명(나)", anon_n: (n) => "익명" + n, op: "글쓴이",
      badge_me: "나", badge_anon: "익",
      ago_now: "방금",
      ago_min: (n) => n + "분 전", ago_hour: (n) => n + "시간 전", ago_day: (n) => n + "일 전",
      board_footer: "인신공격·욕설·차별·광고 및 타인의 사생활을 침해하는 내용은 금지됩니다. 신고 5회 이상 시 자동으로 숨김 처리됩니다.<br />게시물에 대한 법적 책임은 작성자 본인에게 있습니다. · CAU 중국인 유학생 커뮤니티",

      // ---- 로그인 모달 ----
      auth_login_title: "로그인", auth_signup_title: "회원가입", auth_verify_title: "이메일 인증",
      auth_nick: "닉네임 (2~12자)",
      auth_email: "이메일 (학교 메일 @cau.ac.kr)",
      auth_pw: "비밀번호 (6자 이상)",
      auth_code: "인증번호 (메일로 받은 숫자)",
      auth_btn_login: "로그인", auth_btn_signup: "가입하기", auth_btn_verify: "확인",
      auth_no_account: "아직 계정이 없나요?", auth_has_account: "이미 계정이 있나요?",
      auth_go_signup: "회원가입", auth_go_login: "로그인",
      auth_resend: "인증번호 다시 받기",
      auth_processing: "처리 중…", auth_verifying: "확인 중…",
      auth_need_both: "이메일과 비밀번호를 입력해주세요.",
      auth_domain: "@cau.ac.kr 학교 메일로만 가입할 수 있습니다.",
      auth_nick_len: "닉네임은 2~12자로 입력해주세요.",
      auth_pw_len: "비밀번호는 6자 이상이어야 합니다.",
      auth_code_sent: "인증번호를 메일로 보냈습니다. 메일이 안 보이면 스팸함도 확인해주세요.",
      auth_need_code: "인증번호를 입력해주세요.",
      auth_bad_login: "이메일 또는 비밀번호가 올바르지 않습니다.",
      auth_registered: "이미 가입된 이메일입니다. 로그인해주세요.",
      auth_rate: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
      auth_bad_code: "인증번호가 올바르지 않거나 만료되었습니다.",
      auth_resent: "인증번호를 다시 보냈습니다.",
      auth_resend_fail: "전송 실패: ",
    },
  };

  let lang = "zh";
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved === "zh" || saved === "ko") lang = saved;
  } catch (e) { /* 저장소를 못 쓰는 환경(앱 내 브라우저 등)이면 기본값 유지 */ }

  const listeners = [];

  function t(key) {
    let v = D[lang][key];
    if (v === undefined) v = D.zh[key];
    if (v === undefined) return key;
    if (typeof v === "function") return v.apply(null, Array.prototype.slice.call(arguments, 1));
    return v;
  }

  function apply() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "ko";
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.getAttribute("data-i18n")); });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.getAttribute("data-i18n-html")); });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.getAttribute("data-i18n-ph")); });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))); });
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.textContent = t("lang_btn"); btn.setAttribute("aria-label", t("lang_aria"));
    });
  }

  function set(next) {
    if (next !== "zh" && next !== "ko") return;
    lang = next;
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* 무시 */ }
    apply();
    listeners.forEach((fn) => { try { fn(lang); } catch (e) { console.error(e); } });
  }

  function toggle() { set(lang === "zh" ? "ko" : "zh"); }

  function mountButton() {
    if (document.getElementById("langBtn")) return;
    const host = document.querySelector(".topnav-inner");
    if (!host) return;
    const b = document.createElement("button");
    b.type = "button"; b.id = "langBtn"; b.className = "lang-btn";
    b.addEventListener("click", toggle);
    host.appendChild(b);
  }

  mountButton();
  apply();

  return {
    t,
    set,
    toggle,
    apply,
    onChange: (fn) => listeners.push(fn),
    get lang() { return lang; },
  };
})();
