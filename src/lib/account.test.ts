import { describe, expect, it } from "vitest";
import {
  emailProblem,
  hashPassword,
  isValidEmail,
  makeSalt,
  parseAccountState,
  passwordProblem,
  suggestEmailFix,
} from "./account";

describe("isValidEmail", () => {
  it("accepts ordinary addresses", () => {
    expect(isValidEmail("mo@example.com")).toBe(true);
    expect(isValidEmail("  padded@mail.co.uk ")).toBe(true);
  });

  it("rejects things that are not addresses", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("no-at-sign")).toBe(false);
    expect(isValidEmail("two@@example.com")).toBe(false);
    expect(isValidEmail("nodot@example")).toBe(false);
    expect(isValidEmail("spaces in@example.com")).toBe(false);
    expect(isValidEmail("double..dot@example.com")).toBe(false);
    expect(isValidEmail("numeric-tld@example.1x")).toBe(false);
  });

  it("explains each problem", () => {
    expect(emailProblem("")).toBe("Enter your email address.");
    expect(emailProblem("x".repeat(255) + "@a.com")).toContain("too long");
    expect(emailProblem("x".repeat(70) + "@a.com")).toContain("too long");
    expect(emailProblem("nope")).toContain("doesn't look like");
    expect(emailProblem("mo@example.com")).toBeNull();
  });
});

describe("suggestEmailFix", () => {
  it("catches classic domain typos", () => {
    expect(suggestEmailFix("mo@gmial.com")).toBe("mo@gmail.com");
    expect(suggestEmailFix("mo@hotnail.com")).toBe("mo@hotmail.com");
    expect(suggestEmailFix("mo@yaho.com")).toBe("mo@yahoo.com");
    expect(suggestEmailFix("mo@gmail.co")).toBe("mo@gmail.com");
  });

  it("fixes mistyped .com endings on any domain", () => {
    expect(suggestEmailFix("mo@example.con")).toBe("mo@example.com");
    expect(suggestEmailFix("mo@example.cmo")).toBe("mo@example.com");
    expect(suggestEmailFix("mo@example.ocm")).toBe("mo@example.com");
  });

  it("leaves plausible addresses alone", () => {
    expect(suggestEmailFix("mo@gmail.com")).toBeNull();
    expect(suggestEmailFix("mo@example.co.uk")).toBeNull();
    expect(suggestEmailFix("mo@proton.me")).toBeNull();
    expect(suggestEmailFix("garbage")).toBeNull();
  });
});

describe("passwordProblem", () => {
  it("requires eight characters", () => {
    expect(passwordProblem("short")).not.toBeNull();
    expect(passwordProblem("longenough")).toBeNull();
  });
});

describe("hashing", () => {
  it("is deterministic for the same password and salt", async () => {
    const salt = makeSalt();
    const a = await hashPassword("hunter22", salt);
    const b = await hashPassword("hunter22", salt);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs across salts and passwords", async () => {
    const salt = makeSalt();
    expect(await hashPassword("hunter22", salt)).not.toBe(
      await hashPassword("hunter23", salt),
    );
    expect(await hashPassword("hunter22", salt)).not.toBe(
      await hashPassword("hunter22", makeSalt()),
    );
  });

  it("makes unique 32-hex-char salts", () => {
    const salt = makeSalt();
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    expect(makeSalt()).not.toBe(salt);
  });
});

describe("parseAccountState", () => {
  const account = {
    email: "mo@example.com",
    passwordHash: "ab".repeat(32),
    salt: "cd".repeat(16),
    createdAt: 1751500000000,
    lastBackupAt: null,
  };

  it("round-trips a stored state", () => {
    const raw = JSON.stringify({
      version: 1,
      state: { account, signedIn: true },
    });
    const parsed = parseAccountState(raw);
    expect(parsed.account?.email).toBe("mo@example.com");
    expect(parsed.signedIn).toBe(true);
  });

  it("treats missing or corrupt data as no account", () => {
    expect(parseAccountState(null).account).toBeNull();
    expect(parseAccountState("not json").account).toBeNull();
    expect(parseAccountState("{}").account).toBeNull();
    expect(
      parseAccountState(
        JSON.stringify({ version: 1, state: { account: { email: 5 } } }),
      ).account,
    ).toBeNull();
  });

  it("never reports signed in without an account record", () => {
    const raw = JSON.stringify({
      version: 1,
      state: { account: null, signedIn: true },
    });
    expect(parseAccountState(raw).signedIn).toBe(false);
  });
});
