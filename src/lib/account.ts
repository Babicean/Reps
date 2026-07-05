import { mirrorRemove, mirrorWrite } from "./mirror";

/**
 * Account beta — LOCAL ONLY. The record never leaves the device; it exists
 * so the flows are real and the data model is settled before the sync
 * server arrives. The password is salted and hashed even locally (hygiene,
 * not security — the real server will do proper KDF hashing server-side).
 */
const ACCOUNT_KEY = "reps.account";
const ACCOUNT_VERSION = 1;

export interface Account {
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
  /** Stamped by the sync server one day; always null in the local beta. */
  lastBackupAt: number | null;
  /**
   * True once a verification email has been confirmed. Only the sync
   * server can ever set this; the local beta always stores false.
   */
  verified: boolean;
}

export interface AccountState {
  account: Account | null;
  /** An account can exist while logged out; the record stays for log-in. */
  signedIn: boolean;
}

interface AccountShape {
  version: number;
  state: AccountState;
}

export const EMPTY_ACCOUNT_STATE: AccountState = {
  account: null,
  signedIn: false,
};

/**
 * Returns a user-facing problem with the email's shape, or null if it
 * looks sendable. True existence can only be proven by a verification
 * email once the server exists; this catches what's catchable offline.
 */
export function emailProblem(email: string): string | null {
  const e = email.trim();
  if (!e) return "Enter your email address.";
  if (e.length > 254) return "That email address is too long.";
  const match = /^([^\s@]+)@([^\s@]+\.[A-Za-z]{2,})$/.exec(e);
  if (!match || e.includes("..")) {
    return "That doesn't look like an email address.";
  }
  if (match[1].length > 64) return "That email address is too long.";
  return null;
}

export function isValidEmail(value: string): boolean {
  return emailProblem(value) === null;
}

/**
 * Catch the classic domain typos that pass every shape check but would
 * orphan the account the day sync arrives (gmail.con, hotnail.com, …).
 * Returns the corrected address, or null when nothing looks off.
 */
const DOMAIN_FIXES: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmali.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmail.co": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotnail.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloook.com": "outlook.com",
  "outlook.co": "outlook.com",
  "yaho.com": "yahoo.com",
  "yhaoo.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "iclod.com": "icloud.com",
  "icloud.co": "icloud.com",
  "protonmail.co": "protonmail.com",
  "proton.mee": "proton.me",
};

export function suggestEmailFix(email: string): string | null {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at < 1) return null;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  let fixed = DOMAIN_FIXES[domain];
  if (!fixed) {
    // Transposed/mistyped ".com" endings on any domain.
    const dot = domain.lastIndexOf(".");
    if (dot > 0) {
      const tld = domain.slice(dot + 1);
      if (tld === "con" || tld === "cmo" || tld === "ocm" || tld === "comm") {
        fixed = `${domain.slice(0, dot)}.com`;
      }
    }
  }
  if (!fixed || fixed === domain) return null;
  return `${local}@${fixed}`;
}

/** Returns a user-facing problem with the password, or null if it's fine. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  return null;
}

export function makeSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(
  password: string,
  salt: string,
): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

/** Pure parser so loading is testable without storage. */
export function parseAccountState(raw: string | null): AccountState {
  if (!raw) return { ...EMPTY_ACCOUNT_STATE };
  try {
    const parsed = JSON.parse(raw) as AccountShape;
    const a = parsed?.state?.account;
    if (
      !a ||
      typeof a.email !== "string" ||
      typeof a.passwordHash !== "string" ||
      typeof a.salt !== "string"
    ) {
      return { ...EMPTY_ACCOUNT_STATE };
    }
    return {
      account: {
        email: a.email,
        passwordHash: a.passwordHash,
        salt: a.salt,
        createdAt: typeof a.createdAt === "number" ? a.createdAt : Date.now(),
        lastBackupAt:
          typeof a.lastBackupAt === "number" ? a.lastBackupAt : null,
        verified: a.verified === true,
      },
      signedIn: parsed.state.signedIn === true,
    };
  } catch {
    return { ...EMPTY_ACCOUNT_STATE };
  }
}

export function loadAccountState(): AccountState {
  try {
    return parseAccountState(localStorage.getItem(ACCOUNT_KEY));
  } catch {
    return { ...EMPTY_ACCOUNT_STATE };
  }
}

function saveAccountState(state: AccountState): void {
  try {
    const payload: AccountShape = { version: ACCOUNT_VERSION, state };
    const json = JSON.stringify(payload);
    localStorage.setItem(ACCOUNT_KEY, json);
    mirrorWrite(ACCOUNT_KEY, json);
  } catch {
    // Storage unavailable — the account just won't persist.
  }
}

export async function createAccount(
  email: string,
  password: string,
): Promise<AccountState> {
  const salt = makeSalt();
  const state: AccountState = {
    account: {
      email: email.trim().toLowerCase(),
      passwordHash: await hashPassword(password, salt),
      salt,
      createdAt: Date.now(),
      lastBackupAt: null,
      verified: false,
    },
    signedIn: true,
  };
  saveAccountState(state);
  return state;
}

export type SignInResult =
  | { ok: true; state: AccountState }
  | { ok: false; problem: string };

export async function signIn(
  state: AccountState,
  email: string,
  password: string,
): Promise<SignInResult> {
  const account = state.account;
  if (!account || account.email !== email.trim().toLowerCase()) {
    return {
      ok: false,
      problem: "No account with that email on this device.",
    };
  }
  const hash = await hashPassword(password, account.salt);
  if (hash !== account.passwordHash) {
    return { ok: false, problem: "Wrong password." };
  }
  const next: AccountState = { account, signedIn: true };
  saveAccountState(next);
  return { ok: true, state: next };
}

/** Log out but keep the record so logging back in works. */
export function signOut(state: AccountState): AccountState {
  const next: AccountState = { account: state.account, signedIn: false };
  saveAccountState(next);
  return next;
}

/** Remove the account entirely. Entries and settings are untouched. */
export function deleteAccount(): AccountState {
  try {
    localStorage.removeItem(ACCOUNT_KEY);
    mirrorRemove(ACCOUNT_KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
  return { ...EMPTY_ACCOUNT_STATE };
}
