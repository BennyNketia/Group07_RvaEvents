import { listOfUsers } from "./ValidUsers.js";

document.getElementById("login-form").addEventListener("submit", validateExistingUser);

function validateExistingUser(event){
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if(!existingUser(email, password)){
        alert("The email or password is incorrect.");
        return;
    }

    window.location.href = "./index.html";
}

function existingUser(email, password){
    if(email === "testuser@example.com" && password === "Group7RVA"){
        return true;
    }

    for(const user of listOfUsers){
        if(email === user.email && password === user.password){
            return true;
        }
    }

    return false;
}
