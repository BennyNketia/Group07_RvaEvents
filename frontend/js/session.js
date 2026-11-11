/**
 * Keeps track of which account is signed in (UC-01) so other use cases, like UC-02 RSVP,
 *      can check [BR01] "The user must be signed in". Stored in localStorage until we have a real backend.
 */

const SESSION_KEY = "currentUser";

/**
 * startSession() remembers the signed-in account. Only the id and email are stored, never the password.
 */
export function startSession(user){
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, email: user.email }));
}

/**
 * getCurrentUser() returns the signed-in account as { id, email }, or null if nobody is signed in.
 */
export function getCurrentUser(){
    try {
        const user = JSON.parse(localStorage.getItem(SESSION_KEY));
        return user && user.id ? user : null;
    } catch {
        return null;
    }
}

export function endSession(){
    localStorage.removeItem(SESSION_KEY);
}
