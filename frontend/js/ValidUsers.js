/**
 * Temporary "database" of accounts kept in localStorage until we have a real backend.
 */

import { User } from "./User.js";

const USERS_KEY = "listOfUsers";

/**
 * Accounts that always exist so the test cases (TC-01, TC-03) have an account to sign in with.
 */
const SEED_USERS = [
    new User("seed-testuser", "testuser@example.com", "Group7RVA")
];

/**
 * getUsers() reads the stored accounts every time it is called, so a page always sees
 *      accounts created on another page.
 *
 * @returns - The list of stored accounts plus any seed accounts that are not already stored
 */
export function getUsers(){
    const stored = JSON.parse(localStorage.getItem(USERS_KEY)) || [];

    for(const seed of SEED_USERS){
        if(!stored.some(user => normalizeEmail(user.email) === seed.email)){
            stored.push(seed);
        }
    }

    return stored;
}

/**
 * findUserByEmail() looks up an account by email, ignoring case and surrounding spaces.
 *
 * @param {*} email - The email to look up
 * @returns - The matching account, or undefined if there is none
 */
export function findUserByEmail(email){
    const target = normalizeEmail(email);
    return getUsers().find(user => normalizeEmail(user.email) === target);
}

export function userList(userInfo){
    const stored = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    stored.push(userInfo);
    localStorage.setItem(USERS_KEY, JSON.stringify(stored));
}

export function normalizeEmail(email){
    return String(email).trim().toLowerCase();
}
