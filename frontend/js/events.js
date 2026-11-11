/**
 * Event list screen: the UC-02 entry point. The user must be signed in (UC-01) to get here [BR01].
 */

import { getCurrentUser, endSession } from "./session.js";
import { listEvents, formatTimeRange, hasRsvp } from "./rsvp.js";

const user = getCurrentUser();
if(!user){
    window.location.replace("./login.html");
} else {
    document.getElementById("user-email").textContent = user.email;
    document.getElementById("sign-out").addEventListener("click", () => {
        endSession();
        window.location.href = "./login.html";
    });
    renderList();
}

function renderList(){
    const list = document.getElementById("event-list");
    list.replaceChildren();

    for(const event of listEvents()){
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = `./event.html?id=${encodeURIComponent(event.id)}`;
        link.className = "event-card";

        const name = document.createElement("strong");
        name.textContent = event.name;

        const when = document.createElement("span");
        when.textContent = `${event.date} • ${formatTimeRange(event)}`;

        const where = document.createElement("span");
        where.textContent = event.location;

        link.append(name, when, where);

        if(event.canceled || hasRsvp(event.id, user)){
            const badge = document.createElement("span");
            badge.className = event.canceled ? "badge badge-muted" : "badge";
            badge.textContent = event.canceled ? "Canceled" : "Going";
            link.append(badge);
        }

        item.append(link);
        list.append(item);
    }
}
