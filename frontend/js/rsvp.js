/**
 * The rsvp JavaScript file holds the UC-02 (Sign up/Register/RSVP for an event) rules so they can be
 *      used by eventDetails.js and tested without a browser page.
 *
 * Events and RSVPs are kept in ONE localStorage entry (our temporary "database") so every save is
 *      all-or-nothing: if the save fails [E02], neither the RSVP nor the attendee count changes.
 */

import { getCurrentUser } from "./session.js";

const DB_KEY = "rvaEventsDb";

export const LIMITS = {               // Data description
    eventId: 20,
    eventName: 50,
    location: 100,
    description: 2000
};

export const MESSAGES = {
    going: "You're going!",
    saved: "Your RSVP has been saved.",
    rsvpCanceled: "Your RSVP has been canceled.",
    notSignedIn: "You must be signed in to RSVP for an event.",
    notFound: "This event could not be found.",
    eventCanceled: "This event has been canceled.",
    eventStarted: "This event has already started or occurred.",
    eventFull: "This event has reached capacity.",
    connection: "Your RSVP could not be completed. Please try again."
};

/**
 * Example events used until we have a real database. Dates are MM/DD/YYYY and times are 24-hour HH:MM.
 *      EVT001 and EVT002 match the inputs of test cases TC-01 to TC-04.
 */
const SEED_EVENTS = [
    {
        id: "EVT001",
        name: "Richmond Community Art Walk",
        date: "10/10/2027",
        startTime: "14:00",
        endTime: "16:00",
        location: "Downtown Richmond, VA",
        description: "Explore local art and meet neighbors on a guided walk. Meet outside the downtown community gallery.",
        tags: ["Art", "Community"],
        attendeeCount: 25,
        capacity: 100,
        canceled: false
    },
    {
        id: "EVT002",
        name: "Carytown Food Truck Rally",
        date: "05/15/2027",
        startTime: "11:00",
        endTime: "15:00",
        location: "Carytown, Richmond, VA",
        description: "Twenty local food trucks, live music, and lawn games along Cary Street.",
        tags: ["Food", "Music"],
        attendeeCount: 100,
        capacity: 100,
        canceled: false
    },
    {
        id: "EVT003",
        name: "Byrd Park Sunrise Yoga",
        date: "06/05/2027",
        startTime: "07:00",
        endTime: "08:00",
        location: "Byrd Park, Richmond, VA",
        description: "An all-levels outdoor yoga session by the lake. Bring your own mat.",
        tags: ["Fitness", "Outdoors"],
        attendeeCount: 99,
        capacity: 100,
        canceled: false
    },
    {
        id: "EVT004",
        name: "James River Cleanup",
        date: "04/22/2027",
        startTime: "09:00",
        endTime: "12:00",
        location: "Belle Isle, Richmond, VA",
        description: "Help clean up the banks of the James River. Gloves and bags provided.",
        tags: ["Volunteer", "Outdoors"],
        attendeeCount: 40,
        capacity: 100,
        canceled: true
    },
    {
        id: "EVT005",
        name: "Monroe Park Jazz Night",
        date: "08/15/2026",
        startTime: "19:00",
        endTime: "21:00",
        location: "Monroe Park, Richmond, VA",
        description: "Local jazz groups perform under the stars.",
        tags: ["Music"],
        attendeeCount: 60,
        capacity: 100,
        canceled: false
    }
];

/* ---------------------------------------------------------------- Temporary database */

function loadDb(){
    const raw = localStorage.getItem(DB_KEY);
    if(raw === null){
        return { events: structuredClone(SEED_EVENTS), rsvps: [] };
    }
    return JSON.parse(raw);
}

function saveDb(db){
    localStorage.setItem(DB_KEY, JSON.stringify(db));
}

/**
 * Reads the database, turning any storage problem into an [E02] result instead of a crash.
 */
function tryLoadDb(){
    try {
        return { db: loadDb() };
    } catch {
        return { error: fail("connection") };
    }
}

function fail(reason){
    const messageKey = {
        notSignedIn: "notSignedIn",
        notFound: "notFound",
        canceled: "eventCanceled",
        started: "eventStarted",
        full: "eventFull",
        connection: "connection"
    }[reason];
    return { ok: false, reason, message: MESSAGES[messageKey] };
}

/* ---------------------------------------------------------------- Events */

export function listEvents(){
    const { db } = tryLoadDb();
    return db ? db.events : [];
}

/**
 * getEvent() returns the event with the given id, or undefined if there is none.
 */
export function getEvent(eventId){
    return listEvents().find(event => event.id === eventId);
}

/**
 * validateEvent() checks an event against the data description and returns a list of problems (empty if valid).
 */
export function validateEvent(event){
    const problems = [];
    if(typeof event.id !== "string" || event.id.length === 0 || event.id.length > LIMITS.eventId) problems.push("id");
    if(typeof event.name !== "string" || event.name.length === 0 || event.name.length > LIMITS.eventName) problems.push("name");
    if(!/^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/.test(event.date)) problems.push("date");
    if(typeof event.location !== "string" || event.location.length > LIMITS.location) problems.push("location");
    if(typeof event.description !== "string" || event.description.length > LIMITS.description) problems.push("description");
    if(!Number.isInteger(event.attendeeCount) || event.attendeeCount < 0) problems.push("attendeeCount");
    return problems;
}

/**
 * getEventStart() turns the event's MM/DD/YYYY date and HH:MM start time into a local Date.
 */
export function getEventStart(event){
    const [month, day, year] = event.date.split("/").map(Number);
    const [hours, minutes] = event.startTime.split(":").map(Number);
    return new Date(year, month - 1, day, hours, minutes);
}

/**
 * checkAvailability() applies [BR03]: new RSVPs are unavailable for canceled events,
 *      events that have started, or events at capacity.
 *
 * @param {*} now - The current time in ms; only passed in by the tests
 * @returns - null if a new RSVP is allowed, otherwise { ok: false, reason, message } for [E01]
 */
export function checkAvailability(event, now = Date.now()){
    if(event.canceled) return fail("canceled");
    if(getEventStart(event).getTime() <= now) return fail("started");
    if(event.attendeeCount >= event.capacity) return fail("full");
    return null;
}

/* ---------------------------------------------------------------- RSVPs */

/**
 * hasRsvp() is the RSVP Status from the data description: true if the user has an RSVP for the event.
 */
export function hasRsvp(eventId, user = getCurrentUser()){
    if(!user) return false;
    const { db } = tryLoadDb();
    return Boolean(db && db.rsvps.some(r => r.eventId === eventId && r.userId === user.id));
}

/**
 * rsvpForEvent() runs basic path steps 3 and 5: verify the RSVP is valid, then save it and add one attendee.
 *
 * @returns - { ok: true, status: "created" | "existing", event } when the confirmation screen should be shown,
 *            otherwise { ok: false, reason: "notSignedIn" | "notFound" | "canceled" | "started" | "full" | "connection", message }
 */
export function rsvpForEvent(eventId, { user = getCurrentUser(), now = Date.now() } = {}){
    if(!user) return fail("notSignedIn");                                         // [BR01]

    const { db, error } = tryLoadDb();
    if(error) return error;                                                       // [E02]

    const event = db.events.find(e => e.id === eventId);
    if(!event) return fail("notFound");

    // [A05] / [BR02] / [BR05] An RSVP already exists: leave the RSVP and attendee count unchanged
    if(db.rsvps.some(r => r.eventId === eventId && r.userId === user.id)){
        return { ok: true, status: "existing", event };
    }

    const unavailable = checkAvailability(event, now);                            // [E01] / [BR03]
    if(unavailable) return unavailable;

    db.rsvps.push({ eventId, userId: user.id, createdAt: now });
    event.attendeeCount += 1;                                                     // [BR04]

    try {
        saveDb(db);
    } catch {
        return fail("connection");                                                // [E02] nothing was saved
    }

    return { ok: true, status: "created", event };
}

/**
 * cancelRsvp() runs [A02] steps 3-4: remove the RSVP and take one attendee away.
 *
 * @returns - { ok: true, status: "canceled" | "none", event, message } or { ok: false, reason, message }
 *            "none" means there was no RSVP to cancel, so the attendee count is left alone [BR04] [BR05].
 */
export function cancelRsvp(eventId, { user = getCurrentUser() } = {}){
    if(!user) return fail("notSignedIn");

    const { db, error } = tryLoadDb();
    if(error) return error;

    const event = db.events.find(e => e.id === eventId);
    if(!event) return fail("notFound");

    const index = db.rsvps.findIndex(r => r.eventId === eventId && r.userId === user.id);
    if(index === -1){
        return { ok: true, status: "none", event, message: MESSAGES.rsvpCanceled };
    }

    db.rsvps.splice(index, 1);
    event.attendeeCount = Math.max(0, event.attendeeCount - 1);                   // [BR04]

    try {
        saveDb(db);
    } catch {
        return fail("connection");
    }

    return { ok: true, status: "canceled", event, message: MESSAGES.rsvpCanceled };
}

/* ---------------------------------------------------------------- Display + calendar */

/**
 * formatTime() turns a 24-hour "14:00" into "2:00 PM".
 */
export function formatTime(time){
    const [hours, minutes] = time.split(":").map(Number);
    const suffix = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function formatTimeRange(event){
    return `${formatTime(event.startTime)} – ${formatTime(event.endTime)}`;
}

/**
 * buildCalendarEntry() makes an .ics calendar entry with the event name, start time, location and
 *      description [A04]. It only reads the event, so it never changes the RSVP.
 */
export function buildCalendarEntry(event, now = Date.now()){
    const [month, day, year] = event.date.split("/");
    const stamp = time => `${year}${month}${day}T${time.replace(":", "")}00`;
    const utcNow = new Date(now).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//RVA Events//UC02//EN",
        "BEGIN:VEVENT",
        `UID:${event.id}@rva-events`,
        `DTSTAMP:${utcNow}`,
        `DTSTART:${stamp(event.startTime)}`,
        `DTEND:${stamp(event.endTime)}`,
        `SUMMARY:${escapeIcs(event.name)}`,
        `LOCATION:${escapeIcs(event.location)}`,
        `DESCRIPTION:${escapeIcs(event.description)}`,
        "END:VEVENT",
        "END:VCALENDAR"
    ];
    return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}

function escapeIcs(text){
    return String(text)
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\r?\n/g, "\\n");
}

// Calendar files require long lines to be split every 75 characters
function foldIcsLine(line){
    const parts = [];
    for(let i = 0; i < line.length; i += 74){
        parts.push(line.slice(i, i + 74));
    }
    return parts.join("\r\n ");
}
