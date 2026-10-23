/**
 * The signup JavaScript file is used to read user input from signup.html file and confirm
 *      that the information inputted is correct and  aligns with RVA Events' security standards.
 */

import { createAccount } from "./auth.js";

const FIELDS = ["email", "password", "confirmPassword"];

/**
 * This line waits for the user to hit the "Create Account" button inorder to then run the validation checks.
 */
document.getElementById("createAccountForm").addEventListener("submit", validateCreateAccount);

/**
 * validateCreateAccount() collects the user generated content from the form on the sign up page
 *      and tries to create the account. If any field is invalid, a message is shown next to that field
 *      and the valid entries are kept [E02]; otherwise the user is directed to the log in page.
 *
 * @param {*} event - This is the event listener, so this method only executes when the form is submitted
 */
function validateCreateAccount(event){
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    const result = createAccount(email, password, confirmPassword);

    for(const field of FIELDS){
        document.getElementById(field + "-error").textContent = result.ok ? "" : (result.errors[field] || "");
    }

    if(!result.ok){
        return;
    }

    window.location.href = "./login.html";
}
