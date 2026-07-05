import { FormEvent, useEffect, useState } from "react";
import Sheet from "./Sheet";
import type { AccentPref, ThemePref } from "../lib/theme";
import { parseProtein } from "../lib/menu";
import {
  createAccount,
  deleteAccount,
  emailProblem,
  loadAccountState,
  passwordProblem,
  signIn,
  signOut,
  suggestEmailFix,
  type AccountState,
} from "../lib/account";

interface Props {
  open: boolean;
  theme: ThemePref;
  onSetTheme: (theme: ThemePref) => void;
  accent: AccentPref;
  onSetAccent: (accent: AccentPref) => void;
  trackProtein: boolean;
  onSetTrackProtein: (on: boolean) => void;
  proteinTarget: number | null;
  onSetProteinTarget: (grams: number | null) => void;
  onClose: () => void;
}

const THEME_OPTIONS: { id: ThemePref; label: string }[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

const ACCENT_OPTIONS: { id: AccentPref; label: string }[] = [
  { id: "azure", label: "Azure" },
  { id: "emerald", label: "Emerald" },
];

type View = "settings" | "account";
type AccountForm = "none" | "create" | "login";

export default function SettingsSheet({
  open,
  theme,
  onSetTheme,
  accent,
  onSetAccent,
  trackProtein,
  onSetTrackProtein,
  proteinTarget,
  onSetProteinTarget,
  onClose,
}: Props) {
  const [target, setTarget] = useState("");
  const [view, setView] = useState<View>("settings");
  const [acct, setAcct] = useState<AccountState>(() => loadAccountState());
  const [form, setForm] = useState<AccountForm>("none");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Direction-aware drill animation: forward slides in from the right,
  // back slides in from the left; the first render doesn't animate.
  const [backAnim, setBackAnim] = useState(false);

  useEffect(() => {
    if (open) {
      setTarget(proteinTarget !== null ? String(proteinTarget) : "");
      setView("settings");
      setAcct(loadAccountState());
      setForm("none");
      setEmail("");
      setPassword("");
      setFormError(null);
      setConfirmDelete(false);
      setBackAnim(false);
    }
  }, [open, proteinTarget]);

  const commitTarget = () => {
    const parsed = parseProtein(target);
    if (parsed === undefined) {
      // Invalid input: fall back to what's stored.
      setTarget(proteinTarget !== null ? String(proteinTarget) : "");
      return;
    }
    onSetProteinTarget(parsed === 0 ? null : parsed);
  };

  const openForm = (which: AccountForm) => {
    setForm(which);
    setEmail("");
    setPassword("");
    setFormError(null);
    setSuggestion(null);
    setShowPassword(false);
  };

  /** Run the actual create/login once the address is settled. */
  const finishSubmit = async (emailValue: string) => {
    setBusy(true);
    try {
      if (form === "create") {
        setAcct(await createAccount(emailValue, password));
        setForm("none");
      } else {
        const result = await signIn(acct, emailValue, password);
        if (result.ok) {
          setAcct(result.state);
          setForm("none");
        } else {
          setFormError(result.problem);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const submitAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const emProblem = emailProblem(email);
    if (emProblem) {
      setFormError(emProblem);
      return;
    }
    const pwProblem = passwordProblem(password);
    if (form === "create" && pwProblem) {
      setFormError(pwProblem);
      return;
    }
    // Well-formed but suspicious (gmail.con and friends): offer the fix
    // once instead of silently accepting an address mail can't reach.
    if (form === "create" && !suggestion) {
      const fix = suggestEmailFix(email);
      if (fix) {
        setSuggestion(fix);
        return;
      }
    }
    await finishSubmit(email);
  };

  const signedIn = acct.signedIn && acct.account !== null;

  const accountPane = (
    <div className="pane pane-enter" key="account">
      <button
        type="button"
        className="drill-back"
        onClick={() => {
          setBackAnim(true);
          setView("settings");
          setForm("none");
          setConfirmDelete(false);
        }}
      >
        <span aria-hidden="true">‹</span> Settings
      </button>

      {signedIn && acct.account ? (
        <>
          <div className="acct-card">
            <div className="acct-avatar" aria-hidden="true">
              {acct.account.email[0].toUpperCase()}
            </div>
            <div className="acct-id">
              <span className="acct-email">{acct.account.email}</span>
              <span className="acct-since">
                Since{" "}
                {new Date(acct.account.createdAt).toLocaleDateString(
                  undefined,
                  { month: "long", day: "numeric", year: "numeric" },
                )}
              </span>
            </div>
          </div>
          <div className="settings-row">
            <div className="settings-row-text">
              <span className="settings-row-title">Last backed up</span>
              <span className="settings-row-sub">
                Not yet — syncing arrives with the server update.
              </span>
            </div>
            <span className="beta-chip">Beta</span>
          </div>
          <div className="sheet-actions">
            <button
              type="button"
              className="sheet-secondary quiet"
              onClick={() => setAcct(signOut(acct))}
            >
              Log out
            </button>
            <button
              type="button"
              className="sheet-secondary"
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                setAcct(deleteAccount());
                setConfirmDelete(false);
              }}
            >
              {confirmDelete
                ? "Tap again to delete your account"
                : "Delete account"}
            </button>
          </div>
          {confirmDelete && (
            <p className="acct-note" role="alert">
              Deleting removes the account only. Your entries, menu, and
              settings stay on this phone.
            </p>
          )}
        </>
      ) : form === "none" ? (
        <>
          <p className="sheet-sub">
            Keep your reps safe beyond this phone. One account, your data
            backed up — syncing arrives with the server update.
          </p>
          <div className="sheet-actions">
            {acct.account ? (
              <button
                type="button"
                className="add-submit"
                onClick={() => openForm("login")}
              >
                Log in
              </button>
            ) : (
              <button
                type="button"
                className="add-submit"
                onClick={() => openForm("create")}
              >
                Create account
              </button>
            )}
          </div>
          <p className="acct-note">
            <span className="beta-chip">Beta</span> Accounts live only on
            this device for now. Nothing is sent anywhere.
          </p>
        </>
      ) : (
        <>
          <p className="sheet-sub">
            {form === "create"
              ? "Just an email and a password. No name, no photo, no fuss."
              : "Welcome back."}
          </p>
          <form onSubmit={submitAccount} noValidate>
            <div className="field sheet-name">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFormError(null);
                  setSuggestion(null);
                }}
                placeholder="you@example.com"
                aria-label="Email address"
              />
            </div>
            <div className="field sheet-name">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={
                  form === "create" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFormError(null);
                }}
                placeholder={
                  form === "create" ? "Password (8+ characters)" : "Password"
                }
                aria-label="Password"
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M2.5 10s2.8-5 7.5-5 7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="10"
                      cy="10"
                      r="2.4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M3.5 8.5c1.6 1.9 3.9 3.25 6.5 3.25s4.9-1.35 6.5-3.25M10 12v2.25M5.4 11.2l-1.4 1.9M14.6 11.2l1.4 1.9"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>
            </div>
            {suggestion ? (
              <div className="acct-suggest" role="alert">
                <p>
                  Did you mean <strong>{suggestion}</strong>?
                </p>
                <div className="suggest-actions">
                  <button
                    type="button"
                    className="suggest-use"
                    onClick={() => {
                      setEmail(suggestion);
                      setSuggestion(null);
                      void finishSubmit(suggestion);
                    }}
                  >
                    Yes, use that
                  </button>
                  <button
                    type="button"
                    className="suggest-keep"
                    onClick={() => {
                      setSuggestion(null);
                      void finishSubmit(email);
                    }}
                  >
                    Keep what I typed
                  </button>
                </div>
              </div>
            ) : (
              formError && (
                <p className="add-error" role="alert">
                  {formError}
                </p>
              )
            )}
            <div className="sheet-actions">
              <button type="submit" className="add-submit" disabled={busy}>
                {form === "create" ? "Create account" : "Log in"}
              </button>
              <button
                type="button"
                className="sheet-secondary quiet"
                onClick={() => openForm("none")}
              >
                Cancel
              </button>
            </div>
          </form>
          {form === "create" && (
            <p className="acct-note">
              <span className="beta-chip">Beta</span> Stored only on this
              device for now. No email is sent.
            </p>
          )}
        </>
      )}
    </div>
  );

  const settingsPane = (
    <div
      className={`pane${backAnim ? " pane-enter-back" : ""}`}
      key="settings"
    >
      <p className="settings-label">Appearance</p>
      <div className="seg" role="radiogroup" aria-label="Appearance">
        {THEME_OPTIONS.map((o) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={theme === o.id}
            className={`seg-btn${theme === o.id ? " active" : ""}`}
            onClick={() => onSetTheme(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>

      <p className="settings-label">Accent</p>
      <div className="accent-row" role="radiogroup" aria-label="Accent color">
        {ACCENT_OPTIONS.map((o) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={accent === o.id}
            className={`accent-btn${accent === o.id ? " active" : ""}`}
            onClick={() => onSetAccent(o.id)}
          >
            <span className={`accent-dot ${o.id}`} aria-hidden="true" />
            {o.label}
          </button>
        ))}
      </div>

      <p className="settings-label">Protein</p>
      <div className="settings-row">
        <div className="settings-row-text">
          <span className="settings-row-title">Track protein</span>
          <span className="settings-row-sub">
            Adds optional grams to Menu items and entries.
          </span>
        </div>
        <button
          className={`switch${trackProtein ? " on" : ""}`}
          role="switch"
          aria-checked={trackProtein}
          aria-label="Track protein"
          onClick={() => onSetTrackProtein(!trackProtein)}
        >
          <span className="switch-knob" />
        </button>
      </div>
      {trackProtein && (
        <div className="settings-row">
          <div className="settings-row-text">
            <span className="settings-row-title">Daily protein target</span>
            <span className="settings-row-sub">Blank for no target.</span>
          </div>
          <div className="field field-cal settings-target">
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onBlur={commitTarget}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              inputMode="numeric"
              aria-label="Daily protein target in grams"
            />
            <span className="unit">g</span>
          </div>
        </div>
      )}

      <p className="settings-label">Account</p>
      <button
        type="button"
        className="settings-row settings-link"
        onClick={() => setView("account")}
      >
        <div className="settings-row-text">
          <span className="settings-row-title">
            {signedIn && acct.account ? acct.account.email : "Account"}
          </span>
          <span className="settings-row-sub">
            {signedIn
              ? "Signed in · local beta"
              : "Optional. Keep your data safe beyond this phone."}
          </span>
        </div>
        {signedIn && acct.account ? (
          <span className="settings-icon avatar" aria-hidden="true">
            {acct.account.email[0].toUpperCase()}
          </span>
        ) : (
          <span className="settings-icon" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
              <circle
                cx="10"
                cy="7"
                r="3.1"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M4.2 16.4c1-2.6 3.2-4 5.8-4s4.8 1.4 5.8 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
        )}
        <span className="chevron" aria-hidden="true">
          ›
        </span>
      </button>

      <p className="settings-foot">
        Reps v{__APP_VERSION__} · your data never leaves this device.
        <br />
        Back up or restore from the History tab.
      </p>
    </div>
  );

  return (
    <Sheet
      open={open}
      title={view === "account" ? "Account" : "Settings"}
      onClose={onClose}
    >
      {view === "account" ? accountPane : settingsPane}
    </Sheet>
  );
}
