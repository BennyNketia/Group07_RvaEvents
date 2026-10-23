/**
 * Automated versions of the UC-01 (Access Account) test cases TC-01 to TC-04,
 *      plus the equivalence class and boundary value conditions. Run with: npm test
 */

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Minimal stand-in for the browser's localStorage
class MemoryStorage {
    constructor(){ this.data = {}; }
    getItem(key){ return key in this.data ? this.data[key] : null; }
    setItem(key, value){ this.data[key] = String(value); }
    clear(){ this.data = {}; }
}
globalThis.localStorage = new MemoryStorage();

const { signIn, createAccount, validateSignup, validEmail, validPassword, MESSAGES, LOCKOUT_MS } =
    await import("../frontend/js/auth.js");

beforeEach(() => localStorage.clear());

test("TC-01: existing user signs in with a valid email and password", () => {
    assert.deepEqual(signIn("testuser@example.com", "Group7RVA"), { ok: true });
});

test("TC-02: a newly created account can sign in", () => {
    assert.deepEqual(createAccount("newuser@example.com", "Rvaevt26", "Rvaevt26"), { ok: true });
    assert.deepEqual(signIn("newuser@example.com", "Rvaevt26"), { ok: true });
    // Email matching ignores case and surrounding spaces
    assert.deepEqual(signIn("  NewUser@Example.com ", "Rvaevt26"), { ok: true });
});

test("TC-03: wrong password shows the error and locks sign-in after 5 attempts", () => {
    const start = Date.now();

    for(let attempt = 1; attempt <= 4; attempt++){
        const result = signIn("testuser@example.com", "WrongPass1", start);
        assert.equal(result.reason, "invalid", `attempt ${attempt}`);
        assert.equal(result.message, MESSAGES.incorrectLogin);
    }

    const fifth = signIn("testuser@example.com", "WrongPass1", start);
    assert.equal(fifth.reason, "locked");

    // Correct password is still blocked during the lockout
    assert.equal(signIn("testuser@example.com", "Group7RVA", start + 1000).reason, "locked");
    assert.equal(signIn("testuser@example.com", "Group7RVA", start + LOCKOUT_MS - 1).reason, "locked");

    // Works again once the 15 minutes are up
    assert.deepEqual(signIn("testuser@example.com", "Group7RVA", start + LOCKOUT_MS), { ok: true });
});

test("TC-03: a successful sign-in resets the failed attempt count", () => {
    for(let i = 0; i < 4; i++) signIn("testuser@example.com", "WrongPass1");
    assert.deepEqual(signIn("testuser@example.com", "Group7RVA"), { ok: true });
    for(let i = 0; i < 4; i++){
        assert.equal(signIn("testuser@example.com", "WrongPass1").reason, "invalid");
    }
});

test("TC-04: a 7-character password is rejected and the account is not created", () => {
    const result = createAccount("testuser04@example.com", "Test123", "Test123");
    assert.equal(result.ok, false);
    assert.equal(result.errors.password, MESSAGES.weakPassword);
    assert.equal(result.errors.email, undefined, "valid email is kept");
    assert.equal(signIn("testuser04@example.com", "Test123").reason, "invalid");
});

test("BR02: an email can only be registered once", () => {
    assert.equal(createAccount("dup@example.com", "Password1", "Password1").ok, true);
    assert.equal(createAccount("DUP@example.com", "Password1", "Password1").errors.email, MESSAGES.emailTaken);
    assert.equal(validateSignup("testuser@example.com", "Password1", "Password1").email, MESSAGES.emailTaken);
});

test("Equivalence classes: login page null fields are rejected", () => {
    assert.equal(signIn("", "").reason, "required");
    assert.equal(signIn("", "Group7RVA").reason, "required");
    assert.equal(signIn("testuser@example.com", "").reason, "required");
});

test("Equivalence classes: create account page invalid combinations are rejected", () => {
    assert.ok(validateSignup("", "", "").email);
    assert.ok(validateSignup("", "Password1", "").email);
    assert.equal(validateSignup("a@example.com", "Password1", "").confirmPassword, MESSAGES.required);
    assert.equal(validateSignup("a@example.com", "Password1", "Password2").confirmPassword, MESSAGES.passwordMismatch);
    assert.deepEqual(validateSignup("a@example.com", "Password1", "Password1"), {});
});

test("Boundary values: password length", () => {
    assert.equal(validPassword("Abcdef12"), true, "8 characters");
    assert.equal(validPassword("Abcdefg12"), true, "9 characters");
    assert.equal(validPassword("Abcde12"), false, "7 characters");
    assert.equal(validPassword(""), false, "0 characters");
    assert.equal(validPassword("abcdefgh"), false, "no number");
    assert.equal(validPassword("12345678"), false, "no letter");
});

test("Boundary values: email format", () => {
    assert.equal(validEmail("name@domain.com"), true);
    assert.equal(validEmail("namedomain"), false, "just characters");
    assert.equal(validEmail("@"), false, "just @");
    assert.equal(validEmail(".com"), false, "just .domain");
    assert.equal(validEmail("name@"), false, "characters and @");
    assert.equal(validEmail("name@domain"), false, "characters, @ and domain");
});
