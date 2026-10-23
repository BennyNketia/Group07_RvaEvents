/**
 * The auth JavaScript file holds the UC-01 (Access Account) rules so they can be shared by
 *      login.js and signup.js and tested without a browser page.
 */

import { User } from "./User.js";
import { findUserByEmail, normalizeEmail, userList } from "./ValidUsers.js";

export const MAX_FAILED_ATTEMPTS = 5;               // [BR05]
export const LOCKOUT_MS = 15 * 60 * 1000;           // [BR05] 15 minutes
export const EMAIL_MAX_LENGTH = 50;
export const PASSWORD_MAX_LENGTH = 64;

const ATTEMPTS_KEY = "signInAttempts";

export const MESSAGES = {
    required: "This field is required.",
    invalidEmail: "Enter a valid email address.",
    emailTaken: "This email is already registered.",
    weakPassword: "Password must be at least 8 characters and include a letter and a number.",
    passwordMismatch: "Passwords do not match.",
    incorrectLogin: "Incorrect email or password.",
    locked: "Too many failed attempts. Sign-in for this account is locked for 15 minutes."
};

/**
 * validEmail() confirms that the email value matches the format of a valid email.
 *
 * @param {*} email - The email the user input
 * @returns - true if the format of the user inputted email matches the format of a valid email, otherwise false
 */
export function validEmail(email){
    return email.length <= EMAIL_MAX_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * validPassword() confirms the password meets [BR03]: at least 8 characters with at least one letter and one number.
 *
 * @param {*} password - The password the user input
 * @returns - true if the password meets the security standards, otherwise false
 */
export function validPassword(password){
    return password.length >= 8
        && password.length <= PASSWORD_MAX_LENGTH
        && /[A-Za-z]/.test(password)
        && /[0-9]/.test(password);
}

/**
 * validateSignup() checks every Create Account field and collects a message for each invalid one [E02].
 *
 * @returns - An object mapping field ids to error messages; empty if everything is valid
 */
export function validateSignup(email, password, confirmPassword){
    const errors = {};
    email = email.trim();

    if(email === ""){
        errors.email = MESSAGES.required;
    } else if(!validEmail(email)){
        errors.email = MESSAGES.invalidEmail;
    } else if(findUserByEmail(email)){
        errors.email = MESSAGES.emailTaken;                  // [BR02]
    }

    if(password === ""){
        errors.password = MESSAGES.required;
    } else if(!validPassword(password)){
        errors.password = MESSAGES.weakPassword;
    }

    if(confirmPassword === ""){
        errors.confirmPassword = MESSAGES.required;
    } else if(password !== confirmPassword){
        errors.confirmPassword = MESSAGES.passwordMismatch;  // [BR04]
    }

    return errors;
}

/**
 * createAccount() validates the Create Account fields and stores the account if they are all valid [A01].
 *
 * @returns - { ok: true } if the account was created, otherwise { ok: false, errors }
 */
export function createAccount(email, password, confirmPassword){
    const errors = validateSignup(email, password, confirmPassword);
    if(Object.keys(errors).length > 0){
        return { ok: false, errors };
    }

    userList(new User(String(Date.now()), normalizeEmail(email), password));
    return { ok: true };
}

/**
 * signIn() verifies the credentials and enforces the [BR05] lockout.
 *
 * @param {*} now - The current time in ms; only passed in by the tests
 * @returns - { ok: true } on success, otherwise { ok: false, reason: "required" | "invalid" | "locked", message }
 */
export function signIn(email, password, now = Date.now()){
    if(email.trim() === "" || password === ""){
        return { ok: false, reason: "required", message: MESSAGES.required };   // [BR01]
    }

    const key = normalizeEmail(email);
    const attempts = loadAttempts();
    let record = attempts[key] || { count: 0, lockedUntil: 0 };

    if(record.lockedUntil > now){
        return { ok: false, reason: "locked", message: MESSAGES.locked, lockedUntil: record.lockedUntil };
    }

    // An expired lock starts the count over
    if(record.lockedUntil !== 0){
        record = { count: 0, lockedUntil: 0 };
    }

    const user = findUserByEmail(email);
    if(user && user.passwordHash === password){
        delete attempts[key];
        saveAttempts(attempts);
        return { ok: true };
    }

    record.count += 1;
    if(record.count >= MAX_FAILED_ATTEMPTS){
        record.lockedUntil = now + LOCKOUT_MS;
    }
    attempts[key] = record;
    saveAttempts(attempts);

    if(record.lockedUntil > now){
        return { ok: false, reason: "locked", message: MESSAGES.locked, lockedUntil: record.lockedUntil };
    }
    return { ok: false, reason: "invalid", message: MESSAGES.incorrectLogin };
}

function loadAttempts(){
    return JSON.parse(localStorage.getItem(ATTEMPTS_KEY)) || {};
}

function saveAttempts(attempts){
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
}
