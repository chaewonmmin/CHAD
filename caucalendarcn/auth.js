// 공용 로그인(Supabase Auth) 스크립트 — board.html / reviews.html 에서 공유.
// #configBanner, #who/#loginBtn/#logoutBtn, #authModal(및 그 안의 입력칸들)이
// 페이지에 있다고 가정하고 그 DOM을 직접 조작한다.
window.CAUAuth = (function () {
  "use strict";

  // service_role 키는 절대 여기에 넣지 않는다.
  const SUPABASE_URL      = "https://ltmvvsmraejnuboyjarx.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_IQou3ShN90xCLGfXQ8_vZQ_mXRC6be9";

  const $ = (id) => document.getElementById(id);
  const banner = $("configBanner");

  let sb = null;
  try {
    if (!window.supabase || typeof window.supabase.createClient !== "function") throw 0;
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    if (banner) {
      banner.hidden = false;
      banner.textContent = "无法加载数据库组件，请检查网络后刷新。 / 라이브러리를 불러오지 못했습니다.";
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

  function openAuth(m) {
    if (!authModal) return;
    mode = m || "login";
    const isSignup = mode === "signup";
    const isVerify = mode === "verify";

    $("authTitle").textContent = isVerify ? "验证邮箱 · 이메일 인증" : isSignup ? "注册 · 회원가입" : "登录 · 로그인";
    $("authSubmit").textContent = isVerify ? "确认 · 확인" : isSignup ? "注册" : "登录";
    $("nickRow").hidden = !isSignup;
    $("emailRow").hidden = isVerify;
    $("pwRow").hidden = isVerify;
    $("verifyRow").hidden = !isVerify;
    $("resendRow").hidden = !isVerify;
    $("switchRow").hidden = isVerify;
    $("switchText").textContent = isSignup ? "已有账号？" : "还没有账号？";
    $("switchBtn").textContent = isSignup ? "登录" : "注册";
    say($("authStatus"), "");
    authModal.hidden = false;
    (isVerify ? $("authCode") : isSignup ? $("authNick") : $("authEmail")).focus();
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
          if (!token) { say(st, "请输入验证码。 / 인증번호를 입력해주세요.", true); return; }
          say(st, "验证中…");
          const { error } = await sb.auth.verifyOtp({ email: pendingEmail, token, type: "signup" });
          if (error) throw error;
          closeAuth();
          return;
        }

        const email = $("authEmail").value.trim(), pw = $("authPw").value, nick = $("authNick").value.trim();
        if (!email || !pw) { say(st, "请填写邮箱和密码。", true); return; }

        if (mode === "signup") {
          if (!/@cau\.ac\.kr$/i.test(email)) {
            say(st, "请使用学校邮箱（@cau.ac.kr）注册。 / @cau.ac.kr 학교 메일로만 가입할 수 있습니다.", true);
            return;
          }
          if (nick.length < 2 || nick.length > 12) { say(st, "昵称 2~12 个字符。 / 닉네임은 2~12자.", true); return; }
          if (pw.length < 6) { say(st, "密码至少 6 位。", true); return; }

          say(st, "处理中…");
          const { data, error } = await sb.auth.signUp({ email, password: pw, options: { data: { nickname: nick } } });
          if (error) throw error;
          if (!data.session) {
            pendingEmail = email;
            openAuth("verify");
            say($("authStatus"), "验证码已发送，请查收邮箱。 / 인증번호를 이메일로 보냈습니다.");
            return;
          }
          closeAuth();
        } else {
          say(st, "处理中…");
          const { error } = await sb.auth.signInWithPassword({ email, password: pw });
          if (error) throw error;
          closeAuth();
        }
      } catch (err) {
        const m = String((err && err.message) || err);
        say($("authStatus"),
          /Invalid login/i.test(m) ? "邮箱或密码不正确。 / 이메일 또는 비밀번호가 올바르지 않습니다."
          : /already registered/i.test(m) ? "该邮箱已注册，请直接登录。"
          : /rate limit/i.test(m) ? "请求过于频繁，请稍后再试。"
          : /token.*(expired|invalid)|invalid.*token/i.test(m) ? "验证码错误或已过期。 / 인증번호가 올바르지 않거나 만료되었습니다."
          : m, true);
      } finally {
        $("authSubmit").disabled = false;
      }
    });

    if ($("resendBtn")) {
      $("resendBtn").addEventListener("click", async () => {
        if (!pendingEmail) return;
        $("resendBtn").disabled = true;
        const { error } = await sb.auth.resend({ type: "signup", email: pendingEmail });
        $("resendBtn").disabled = false;
        say($("authStatus"), error ? ("发送失败：" + error.message) : "已重新发送验证码。 / 인증번호를 다시 보냈습니다.", Boolean(error));
      });
    }
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
