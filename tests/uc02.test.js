/**
 * Automated versions of the UC-02 (Sign up/Register/RSVP for an event) test cases TC-01 to TC-04,
 *      plus the equivalence class, boundary value, alternative path and exception path conditions.
 *      Run with: npm test
 */

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Minimal stand-in for the browser's localStorage
class MemoryStorage {
    constructor(){ this.data = {}; }
    getItem(key){ return key in this.data ? this.data[key] : null; }
    setItem(key, value){ this.data[key] = String(value); }
    removeItem(key){ delete this.data[key]; }
    clear(){ this.data = {}; }
}
globalThis.localStorage = new MemoryStorage();

const rsvp = await import("../frontend/js/rsvp.js");
const { signIn } = await import("../frontend/js/auth.js");
const { getCurrentUser, endSession } = await import("../frontend/js/session.js");
const {
    rsvpForEvent, cancelRsvp, hasRsvp, getEvent, listEvents, checkAvailability,
    buildCalendarEntry, validateEvent, formatTimeRange, MESSAGES
} = rsvp;

const USER = { id: "seed-testuser", email: "testuser@example.com" };
const OTHER_USER = { id: "user-2", email: "other@example.com" };
const NOW = new Date(2026, 10, 11, 12, 0).getTime();        // 11/11/2026 12:00 PM

beforeEach(() => localStorage.clear());

/** Replace one event's fields in the temporary database, e.g. to set a boundary attendee count. */
function setEvent(eventId, changes){
    const db = { events: listEvents().map(e => e.id === eventId ? { ...e, ...changes } : e), rsvps: [] };
    localStorage.setItem("rvaEventsDb", JSON.stringify(db));
}

/** Make every save fail, like a dropped connection, while fn runs. */
function withConnectionFailure(fn){
    const original = localStorage.setItem;
    localStorage.setItem = () => { throw new Error("Network timeout"); };
    try { return fn(); } finally { localStorage.setItem = original; }
}

/* ======================================================================= Test cases */

test("TC-01: signed-in user successfully RSVPs for an available event", () => {
    // Preconditions: signed in, event not started, capacity available, no existing RSVP
    assert.deepEqual(signIn("testuser@example.com", "Group7RVA"), { ok: true });
    const user = getCurrentUser();
    assert.equal(user.id, USER.id);

    // Steps 1-2: event details are displayed with the TC-01 inputs
    const before = getEvent("EVT001");
    assert.equal(before.name, "Richmond Community Art Walk");
    assert.equal(before.attendeeCount, 25);
    assert.equal(hasRsvp("EVT001", user), false, "RSVP status: False");
    assert.equal(checkAvailability(before, NOW), null, "RSVP option is enabled");

    // Steps 3-4: select RSVP, confirmation screen data
    const result = rsvpForEvent("EVT001", { now: NOW });
    assert.equal(result.ok, true);
    assert.equal(result.status, "created");
    assert.equal(result.event.name, "Richmond Community Art Walk");
    assert.equal(`${result.event.date} • ${formatTimeRange(result.event)}`, "10/10/2027 • 2:00 PM – 4:00 PM");
    assert.equal(MESSAGES.going, "You're going!");

    // Steps 5-6: RSVP saved, count is 26, RSVP button becomes Cancel RSVP
    assert.equal(getEvent("EVT001").attendeeCount, 26);
    assert.equal(hasRsvp("EVT001", user), true);
});

test("TC-02: user cancels an existing RSVP and the attendee count decreases", () => {
    rsvpForEvent("EVT001", { user: USER, now: NOW });
    assert.equal(getEvent("EVT001").attendeeCount, 26, "precondition: count 26");
    assert.equal(hasRsvp("EVT001", USER), true, "precondition: RSVP status True");

    const result = cancelRsvp("EVT001", { user: USER });
    assert.equal(result.ok, true);
    assert.equal(result.status, "canceled");
    assert.equal(result.message, "Your RSVP has been canceled.");
    assert.equal(getEvent("EVT001").attendeeCount, 25);
    assert.equal(hasRsvp("EVT001", USER), false, "RSVP option returns");
});

test("TC-03: a repeated RSVP request does not create a duplicate or change the count", () => {
    rsvpForEvent("EVT001", { user: USER, now: NOW });
    assert.equal(getEvent("EVT001").attendeeCount, 26);

    const repeat = rsvpForEvent("EVT001", { user: USER, now: NOW });
    assert.equal(repeat.ok, true);
    assert.equal(repeat.status, "existing", "[A05] existing RSVP detected");
    assert.equal(getEvent("EVT001").attendeeCount, 26, "count stays 26");

    const stored = JSON.parse(localStorage.getItem("rvaEventsDb")).rsvps
        .filter(r => r.eventId === "EVT001" && r.userId === USER.id);
    assert.equal(stored.length, 1, "only one RSVP record");
});

test("TC-04: event at maximum capacity rejects new RSVPs", () => {
    const event = getEvent("EVT002");
    assert.equal(event.attendeeCount, 100);
    assert.equal(event.capacity, 100);

    const availability = checkAvailability(event, NOW);
    assert.equal(availability.reason, "full", "RSVP option is disabled");
    assert.equal(availability.message, "This event has reached capacity.");

    const result = rsvpForEvent("EVT002", { user: USER, now: NOW });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "full");
    assert.equal(getEvent("EVT002").attendeeCount, 100);
    assert.equal(hasRsvp("EVT002", USER), false);
});

/* ======================================================================= Equivalence classes */

test("ECP valid: signed-in user, no prior RSVP, upcoming event with capacity", () => {
    assert.equal(rsvpForEvent("EVT003", { user: USER, now: NOW }).status, "created");
});

test("ECP valid: user selects Add to Calendar after RSVPing without changing the RSVP [A04]", () => {
    rsvpForEvent("EVT001", { user: USER, now: NOW });
    const ics = buildCalendarEntry(getEvent("EVT001"), NOW);

    assert.match(ics, /BEGIN:VEVENT/);
    assert.match(ics, /SUMMARY:Richmond Community Art Walk/);
    assert.match(ics, /DTSTART:20271010T140000/);
    assert.match(ics, /DTEND:20271010T160000/);
    assert.match(ics, /LOCATION:Downtown Richmond\\, VA/);
    assert.match(ics, /DESCRIPTION:Explore local art/);

    assert.equal(hasRsvp("EVT001", USER), true);
    assert.equal(getEvent("EVT001").attendeeCount, 26);
});

test("ECP invalid: user is not signed in [BR01]", () => {
    endSession();
    const result = rsvpForEvent("EVT001", { now: NOW });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "notSignedIn");
    assert.equal(getEvent("EVT001").attendeeCount, 25);
});

test("ECP invalid: event has been canceled [E01]", () => {
    const result = rsvpForEvent("EVT004", { user: USER, now: NOW });
    assert.equal(result.reason, "canceled");
    assert.equal(result.message, MESSAGES.eventCanceled);
    assert.equal(getEvent("EVT004").attendeeCount, 40);
});

test("ECP invalid: event has already started or occurred [E01]", () => {
    const past = rsvpForEvent("EVT005", { user: USER, now: NOW });
    assert.equal(past.reason, "started");

    // Exactly at the start time counts as started
    const startOfArtWalk = new Date(2027, 9, 10, 14, 0).getTime();
    assert.equal(rsvpForEvent("EVT001", { user: USER, now: startOfArtWalk }).reason, "started");
    assert.equal(rsvpForEvent("EVT001", { user: USER, now: startOfArtWalk - 60_000 }).status, "created");
});

test("ECP invalid: connection failure saves nothing [E02]", () => {
    const result = withConnectionFailure(() => rsvpForEvent("EVT001", { user: USER, now: NOW }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "connection");
    assert.equal(result.message, "Your RSVP could not be completed. Please try again.");
    assert.equal(hasRsvp("EVT001", USER), false);
    assert.equal(getEvent("EVT001").attendeeCount, 25);

    // Trying again once the connection is back works
    assert.equal(rsvpForEvent("EVT001", { user: USER, now: NOW }).status, "created");
    assert.equal(getEvent("EVT001").attendeeCount, 26);
});

test("E02: connection failure during cancel leaves the RSVP in place", () => {
    rsvpForEvent("EVT001", { user: USER, now: NOW });
    const result = withConnectionFailure(() => cancelRsvp("EVT001", { user: USER }));
    assert.equal(result.reason, "connection");
    assert.equal(hasRsvp("EVT001", USER), true);
    assert.equal(getEvent("EVT001").attendeeCount, 26);
});

/* ======================================================================= Boundary values */

test("BVA capacity: 99 attendees -> RSVP allowed, count becomes 100", () => {
    setEvent("EVT001", { attendeeCount: 99 });
    assert.equal(rsvpForEvent("EVT001", { user: USER, now: NOW }).status, "created");
    assert.equal(getEvent("EVT001").attendeeCount, 100);

    // The next user is now blocked
    assert.equal(rsvpForEvent("EVT001", { user: OTHER_USER, now: NOW }).reason, "full");
    assert.equal(getEvent("EVT001").attendeeCount, 100);
});

test("BVA capacity: 100 attendees -> RSVP rejected", () => {
    setEvent("EVT001", { attendeeCount: 100 });
    assert.equal(rsvpForEvent("EVT001", { user: USER, now: NOW }).reason, "full");
    assert.equal(getEvent("EVT001").attendeeCount, 100);
});

test("BVA capacity: 101 attendees -> RSVP rejected", () => {
    setEvent("EVT001", { attendeeCount: 101 });
    assert.equal(rsvpForEvent("EVT001", { user: USER, now: NOW }).reason, "full");
    assert.equal(getEvent("EVT001").attendeeCount, 101);
});

test("BVA RSVPs per user: 0 -> RSVP creates exactly 1", () => {
    rsvpForEvent("EVT001", { user: USER, now: NOW });
    const count = JSON.parse(localStorage.getItem("rvaEventsDb")).rsvps.filter(r => r.userId === USER.id).length;
    assert.equal(count, 1);
});

test("BVA RSVPs per user: 1 -> cancel removes it and count decreases by 1", () => {
    rsvpForEvent("EVT001", { user: USER, now: NOW });
    cancelRsvp("EVT001", { user: USER });
    assert.equal(getEvent("EVT001").attendeeCount, 25);
    assert.equal(hasRsvp("EVT001", USER), false);
});

test("BVA RSVPs per user: 0 -> cancelling again does not decrease the count [BR05]", () => {
    rsvpForEvent("EVT001", { user: USER, now: NOW });
    cancelRsvp("EVT001", { user: USER });
    const again = cancelRsvp("EVT001", { user: USER });
    assert.equal(again.status, "none");
    assert.equal(getEvent("EVT001").attendeeCount, 25);
});

/* ======================================================================= Other rules */

test("A05: an existing RSVP still shows the confirmation even if the event is now full", () => {
    rsvpForEvent("EVT003", { user: USER, now: NOW });                // 99 -> 100
    const repeat = rsvpForEvent("EVT003", { user: USER, now: NOW });
    assert.equal(repeat.status, "existing");
    assert.equal(getEvent("EVT003").attendeeCount, 100);
});

test("BR02: RSVPs are per user, so two users each count once", () => {
    rsvpForEvent("EVT001", { user: USER, now: NOW });
    rsvpForEvent("EVT001", { user: OTHER_USER, now: NOW });
    assert.equal(getEvent("EVT001").attendeeCount, 27);
    cancelRsvp("EVT001", { user: OTHER_USER });
    assert.equal(hasRsvp("EVT001", USER), true);
    assert.equal(getEvent("EVT001").attendeeCount, 26);
});

test("Unknown event id is rejected", () => {
    assert.equal(rsvpForEvent("EVT999", { user: USER, now: NOW }).reason, "notFound");
});

test("Data description: every seed event is valid", () => {
    for(const event of listEvents()){
        assert.deepEqual(validateEvent(event), [], event.id);
    }
    const bad = { ...getEvent("EVT001"), id: "X".repeat(21), name: "N".repeat(51), date: "2027-10-10", attendeeCount: -1 };
    assert.deepEqual(validateEvent(bad), ["id", "name", "date", "attendeeCount"]);
});
