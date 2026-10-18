import { useEffect, useState } from "react";
import { api } from "../api";
import { ActionForm, Icon, Notice } from "../components/UI";

export default function Auth({ onLogin, returnTo }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [domain, setDomain] = useState("your university domain");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resending, setResending] = useState(false);
  function changeMode(next) {
    setMode(next);
    setMessage("");
    setError("");
    setShowPassword(false);
  }
  useEffect(() => {
    api("/auth/settings")
      .then((d) => setDomain(d.emailDomain))
      .catch((e) => setError(e.message));
  }, []);
  async function submit(values) {
    setMessage("");
    if (mode === "login") {
      const user = await api("/auth/login", { method: "POST", body: values });
      onLogin(user);
      location.hash =
        user.role === "Admin"
          ? "/admin"
          : returnTo?.startsWith("/") && !returnTo.startsWith("//")
            ? returnTo
            : "/";
    } else if (mode === "register") {
      // Keep the address available if SMTP is not started yet.
      setEmail(values.email);
      await api("/auth/register", { method: "POST", body: values });
      setMode("verify");
      setMessage("Code sent. Check your university email inbox.");
    } else {
      const user = await api("/auth/verify", { method: "POST", body: values });
      onLogin(user);
      location.hash = user.role === "Admin" ? "/admin" : `/profile/${user.id}`;
    }
  }
  async function resend() {
    if (resending) return;
    setError("");
    setResending(true);
    try {
      await api("/auth/resend", { method: "POST", body: { email } });
      setMessage("A new code is on its way.");
    } catch (e) {
      setError(e.message);
    } finally {
      setResending(false);
    }
  }
  return (
    <section className="auth-layout">
      <aside className="auth-story">
        <span className="eyebrow">A COMMUNITY YOU BELONG TO</span>
        <h2>
          One campus.
          <br />
          More possibilities.
        </h2>
        <p>Your spare calculator could be someone’s next great find.</p>
        <img src="/images/hero.jpg" alt="A real student study workspace" />
        <div>
          <Icon name="shield" /> A verified student community
        </div>
      </aside>
      <div className="auth-form">
        <span className="eyebrow">WELCOME TO PREMSCART</span>
        <h1>
          {mode === "login"
            ? "Good to see you."
            : mode === "register"
              ? "Join your campus."
              : "Check your inbox."}
        </h1>
        <p>
          {mode === "verify"
            ? "Enter the six-digit code sent to your university email."
            : `Use your @${domain} email to get started.`}
        </p>
        <Notice success>{message}</Notice>
        <Notice>{error}</Notice>
        <ActionForm
          key={mode}
          onSubmit={submit}
          label={
            mode === "login"
              ? "Sign in"
              : mode === "register"
                ? "Create account"
                : "Verify email"
          }
        >
          {mode === "register" && (
            <>
              <label>
                Full name
                <input
                  name="name"
                  required
                  minLength="2"
                  maxLength="80"
                  autoComplete="name"
                />
              </label>
              <label>
                Department
                <input
                  name="department"
                  required
                  maxLength="80"
                  placeholder="Computer Science & Engineering"
                />
              </label>
            </>
          )}
          <label>
            University email
            <input
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder={`you@${domain}`}
            />
          </label>
          {mode === "verify" ? (
            <label>
              Verification code
              <input
                name="code"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength="6"
                autoComplete="one-time-code"
              />
            </label>
          ) : (
            <div className="field-group">
              <label htmlFor="password">Password</label>
              <span className="password-field">
                <input
                  id="password"
                  aria-describedby={
                    mode === "register" ? "password-hint" : undefined
                  }
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={mode === "register" ? 8 : undefined}
                  maxLength="100"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <Icon name={showPassword ? "eyeSlash" : "eye"} size={17} />
                </button>
              </span>
              {mode === "register" && (
                <small id="password-hint">At least 8 characters.</small>
              )}
            </div>
          )}
        </ActionForm>
        <div className="auth-links">
          <button
            className="text-button"
            onClick={() =>
              changeMode(mode === "register" ? "login" : "register")
            }
          >
            {mode === "register"
              ? "Already a member? Sign in"
              : "New here? Create an account"}
          </button>
          <button
            className="text-button"
            onClick={() => changeMode(mode === "verify" ? "login" : "verify")}
          >
            {mode === "verify"
              ? "Back to sign in"
              : "Need to verify your email?"}
          </button>
          {mode === "verify" && (
            <button
              className="text-button"
              disabled={resending || !email.trim()}
              onClick={resend}
            >
              {resending ? "Sending…" : "Resend code"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
