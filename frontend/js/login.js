import { signIn } from "./auth.js";

document.getElementById("login-form").addEventListener("submit", validateExistingUser);

function validateExistingUser(event){
    event.preventDefault();

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const errorMessage = document.getElementById("login-error");

    const result = signIn(emailInput.value, passwordInput.value);

    if(!result.ok){
        // [E01] Keep the email and clear the password field
        errorMessage.textContent = result.message;
        passwordInput.value = "";
        passwordInput.focus();
        return;
    }

    errorMessage.textContent = "";
    window.location.href = "./index.html";
}
