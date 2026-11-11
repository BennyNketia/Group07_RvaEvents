/**
 * Event details screen for UC-02. Shows [PRO01], the cancel prompt [A02], and the RSVP confirmation [PRO02].
 *      All of the RSVP rules live in rsvp.js; this file only updates the page.
 */

import { getCurrentUser } from "./session.js";
import {
    getEvent, hasRsvp, checkAvailability, rsvpForEvent, cancelRsvp,
    formatTimeRange, buildCalendarEntry, MESSAGES
} from "./rsvp.js";

const $ = id => document.getElementById(id);
const screens = ["details-screen", "cancel-screen", "confirmation-screen"];

const user = getCurrentUser();
const eventId = new URLSearchParams(window.location.search).get("id");

if(!user){
    window.location.replace("./login.html");                        // [BR01]
} else {
    $("rsvp-button").addEventListener("click", onRsvp);
    $("cancel-rsvp-button").addEventListener("click", () => showScreen("cancel-screen"));
    $("back-button").addEventListener("click", () => { window.location.href = "./events.html"; });   // [A01]
    $("confirm-cancel-button").addEventListener("click", onConfirmCancel);
    $("cancel-back-button").addEventListener("click", () => showDetails());                          // [A03]
    $("calendar-button").addEventListener("click", onAddToCalendar);
    $("done-button").addEventListener("click", () => showDetails());                                 // Steps 6-8
    showDetails();
}

function showScreen(id){
    for(const screen of screens){
        $(screen).hidden = screen !== id;
    }
}

/**
 * Step 1: present the event details. If the user already RSVP'd, show Cancel RSVP instead of RSVP (step 8).
 *      If the event is unavailable, disable RSVP and say why [E01].
 */
function showDetails(message = ""){
    showScreen("details-screen");
    const event = getEvent(eventId);

    if(!event){
        $("event-name").textContent = MESSAGES.notFound;
        $("rsvp-button").disabled = true;
        $("details-message").textContent = "";
        return;
    }

    $("event-name").textContent = event.name;
    $("event-date").textContent = event.date;
    $("event-time").textContent = formatTimeRange(event);
    $("event-location").textContent = event.location;
    $("event-description").textContent = event.description;
    $("event-tags").textContent = event.tags.join(", ");
    $("event-attendees").textContent = String(event.attendeeCount);
    $("cancel-event-name").textContent = event.name;

    const going = hasRsvp(event.id, user);
    $("rsvp-button").hidden = going;
    $("cancel-rsvp-button").hidden = !going;

    const unavailable = going ? null : checkAvailability(event);
    $("rsvp-button").disabled = Boolean(unavailable);
    $("details-message").textContent = message || (unavailable ? unavailable.message : "");
}

/**
 * Steps 2-5: verify and save the RSVP, then show the confirmation screen.
 */
function onRsvp(){
    const result = rsvpForEvent(eventId, { user });

    if(!result.ok){
        showDetails(result.message);                                 // [E01] or [E02]
        return;
    }

    const { event } = result;
    $("going-message").textContent = MESSAGES.going;
    $("confirm-event-name").textContent = event.name;
    $("confirm-event-when").textContent = `${event.date} • ${formatTimeRange(event)}`;
    showScreen("confirmation-screen");
}

/**
 * [A02] steps 3-5: remove the RSVP and return to the details screen with the message.
 */
function onConfirmCancel(){
    const result = cancelRsvp(eventId, { user });
    showDetails(result.message);
}

/**
 * [A04] Download a calendar entry. This does not touch the RSVP, and the user stays on the confirmation screen.
 */
function onAddToCalendar(){
    const event = getEvent(eventId);
    if(!event) return;

    const blob = new Blob([buildCalendarEntry(event)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.id}.ics`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
