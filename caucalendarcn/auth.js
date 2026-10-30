// 공용 로그인(Supabase Auth) 스크립트 — board.html / reviews.html 에서 공유.
// 로그인 모달 HTML은 이 파일이 직접 만들어 넣는다(페이지마다 복사하지 않음).
// 페이지에는 #configBanner(선택), #who/#loginBtn/#logoutBtn(상단 네비) 만 있으면 된다.
// 문구는 i18n.js(I18N.t)를 통해 中文/한국어로 바뀐다. i18n.js 를 먼저 불러와야 한다.
window.CAUAuth = (function () {
  "use strict";

  // service_role 키는 절대 여기에 넣지 않는다.
  const SUPABASE_URL      = "https://ltmvvsmraejnuboyjarx.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_IQou3ShN90xCLGfXQ8_vZQ_mXRC6be9";

  const t = (...a) => I18N.t(...a);
  const $ = (id) => document.getElementById(id);
  const banner = $("configBanner");

  let sb = null;
  try {
    if (!window.supabase || typeof window.supabase.createClient !== "function") throw 0;
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    if (banner) {
      banner.hidden = false;
      banner.textContent = t("cfg_lib_fail");
    }
    return {
      getClient: () => null,
      getSession: () => null,
      ready: () => Promise.resolve(null),
      onChange: () => {},
      needLogin: () => false,
      openAuth: () => {},
      signOut: () => Promise.resolve(),
    };
  }

  // ---------- 로그인 모달 HTML 주입 ----------
  if (!$("authModal")) {
    const holder = document.createElement("div");
    holder.innerHTML =
      '<div class="backdrop" id="authModal" hidden>' +
        '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="authTitle">' +
          '<button type="button" class="lang-btn sheet-lang" id="authLang"></button>' +
          '<h2 id="authTitle"></h2>' +
          '<form id="authForm" novalidate>' +
            '<div id="nickRow" hidden>' +
              '<label for="authNick" data-i18n="auth_nick"></label>' +
              '<input type="text" id="authNick" maxlength="12" autocomplete="nickname" />' +
            '</div>' +
            '<div id="emailRow">' +
              '<label for="authEmail" data-i18n="auth_email"></label>' +
              '<input type="email" id="authEmail" autocomplete="email" required />' +
            '</div>' +
            '<div id="pwRow">' +
              '<label for="authPw" data-i18n="auth_pw"></label>' +
              '<input type="password" id="authPw" autocomplete="current-password" minlength="6" required />' +
            '</div>' +
            '<div id="verifyRow" hidden>' +
              '<label for="authCode" data-i18n="auth_code"></label>' +
              '<input type="text" id="authCode" inputmode="numeric" autocomplete="one-time-code" maxlength="8" />' +
            '</div>' +
            '<div class="row">' +
              '<button type="submit" class="btn-primary" id="authSubmit"></button>' +
              '<button type="button" id="authClose" data-i18n="close"></button>' +
            '</div>' +
            '<p class="msg" id="authStatus" style="margin:10px 0 0;" aria-live="polite"></p>' +
            '<p class="switch" id="resendRow" hidden><button type="button" id="resendBtn" data-i18n="auth_resend"></button></p>' +
          '</form>' +
          '<p class="switch" id="switchRow"><span id="switchText"></span> <button type="button" id="switchBtn"></button></p>' +
        '</div>' +
      '</div>';
    document.body.appendChild(holder.firstElementChild);
    $("authLang").addEventListener("click", () => I18N.toggle());
    I18N.apply();
  }

  let session;
  const listeners = [];

  const readyPromise = sb.auth.getSession().then(({ data }) => {
    session = data.session;
    renderNav(session);
    return session;
  });

  sb.auth.onAuthStateChange((_evt, s) => {
    session = s;
    renderNav(s);
    listeners.forEach((fn) => fn(s));
  });

  function say(el, m, bad) {
    if (!el) return;
    el.textContent = m || "";
    el.style.color = bad ? "var(--gold)" : "var(--ink-soft)";
  }

  // ---------- 상단 who/登录/退出 ----------
  function renderNav(s) {
    const who = $("who"), loginBtn = $("loginBtn"), logoutBtn = $("logoutBtn");
    if (!who || !loginBtn || !logoutBtn) return;
    if (s) {
      const n = s.user.user_metadata && s.user.user_metadata.nickname;
      who.textContent = n || s.user.email;
      loginBtn.hidden = true; logoutBtn.hidden = false;
    } else {
      who.textContent = "";
      loginBtn.hidden = false; logoutBtn.hidden = true;
    }
  }
  if ($("loginBtn"))  $("loginBtn").addEventListener("click", () => openAuth("login"));
  if ($("logoutBtn")) $("logoutBtn").addEventListener("click", () => sb.auth.signOut());

  // ---------- 로그인 / 가입 / 인증번호 모달 ----------
  const authModal = $("authModal");
  let mode = "login";
  let pendingEmail = "";

  // 현재 mode 에 맞게 제목·버튼·입력칸 표시를 갱신(언어가 바뀌어도 다시 호출됨)
  function renderMode() {
    const isSignup = mode === "signup";
    const isVerify = mode === "verify";
    $("authTitle").textContent = t(isVerify ? "auth_verify_title" : isSignup ? "auth_signup_title" : "auth_login_title");
    $("authSubmit").textContent = t(isVerify ? "auth_btn_verify" : isSignup ? "auth_btn_signup" : "auth_btn_login");
    $("nickRow").hidden = !isSignup;
    $("emailRow").hidden = isVerify;
    $("pwRow").hidden = isVerify;
    $("verifyRow").hidden = !isVerify;
    $("resendRow").hidden = !isVerify;
    $("switchRow").hidden = isVerify;
    $("switchText").textContent = t(isSignup ? "auth_has_account" : "auth_no_account");
    $("switchBtn").textContent = t(isSignup ? "auth_go_login" : "auth_go_signup");
  }

  function openAuth(m) {
    if (!authModal) return;
    mode = m || "login";
    renderMode();
    say($("authStatus"), "");
    authModal.hidden = false;
    (mode === "verify" ? $("authCode") : mode === "signup" ? $("authNick") : $("authEmail")).focus();
  }

  function closeAuth() {
    if (!authModal) return;
    authModal.hidden = true;
    $("authForm").reset();
    mode = "login";
    pendingEmail = "";
  }

  function needLogin() {
    return session ? true : (openAuth("login"), false);
  }

  function errorText(err) {
    const m = String((err && err.message) || err);
    return /Invalid login/i.test(m) ? t("auth_bad_login")
      : /already registered/i.test(m) ? t("auth_registered")
      : /rate limit/i.test(m) ? t("auth_rate")
      : /token.*(expired|invalid)|invalid.*token/i.test(m) ? t("auth_bad_code")
      : m;
  }

  if (authModal) {
    $("authClose").addEventListener("click", closeAuth);
    authModal.addEventListener("click", (e) => { if (e.target === authModal) closeAuth(); });
    $("switchBtn").addEventListener("click", () => openAuth(mode === "signup" ? "login" : "signup"));

    $("authForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const st = $("authStatus");
      $("authSubmit").disabled = true;

      try {
        if (mode === "verify") {
          const token = $("authCode").value.trim();
          if (!token) { say(st, t("auth_need_code"), true); return; }
          say(st, t("auth_verifying"));
          const { error } = await sb.auth.verifyOtp({ email: pendingEmail, token, type: "signup" });
          if (error) throw error;
          closeAuth();
          return;
        }

        const email = $("authEmail").value.trim(), pw = $("authPw").value, nick = $("authNick").value.trim();
        if (!email || !pw) { say(st, t("auth_need_both"), true); return; }

        if (mode === "signup") {
          if (!/@cau\.ac\.kr$/i.test(email)) { say(st, t("auth_domain"), true); return; }
          if (nick.length < 2 || nick.length > 12) { say(st, t("auth_nick_len"), true); return; }
          if (pw.length < 6) { say(st, t("auth_pw_len"), true); return; }

          say(st, t("auth_processing"));
          const { data, error } = await sb.auth.signUp({ email, password: pw, options: { data: { nickname: nick } } });
          if (error) throw error;
          if (!data.session) {
            pendingEmail = email;
            openAuth("verify");
            say($("authStatus"), t("auth_code_sent"));
            return;
          }
          closeAuth();
        } else {
          say(st, t("auth_processing"));
          const { error } = await sb.auth.signInWithPassword({ email, password: pw });
          if (error) throw error;
          closeAuth();
        }
      } catch (err) {
        say($("authStatus"), errorText(err), true);
      } finally {
        $("authSubmit").disabled = false;
      }
    });

    $("resendBtn").addEventListener("click", async () => {
      if (!pendingEmail) return;
      $("resendBtn").disabled = true;
      const { error } = await sb.auth.resend({ type: "signup", email: pendingEmail });
      $("resendBtn").disabled = false;
      say($("authStatus"), error ? (t("auth_resend_fail") + error.message) : t("auth_resent"), Boolean(error));
    });

    // 언어를 바꾸면 모달의 제목·버튼 문구를 새 언어로 다시 쓰고, 이전 언어로 뜬 안내 문구는 지운다.
    I18N.onChange(() => {
      renderMode();
      say($("authStatus"), "");
    });
  }

  return {
    getClient: () => sb,
    getSession: () => session,
    ready: () => readyPromise,
    onChange: (fn) => listeners.push(fn),
    needLogin,
    openAuth,
    signOut: () => sb.auth.signOut(),
  };
})();
