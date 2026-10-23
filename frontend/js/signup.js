/**
 * The signup JavaScript file is used to read user input from signup.html file and confirm
 *      that the information inputted is correct and  aligns with RVA Events' security standards.
 */

/**
 * This line waits for the user to hit the "Create Account" button inorder to then run the validation checks.
 */
document.getElementById("createAccountForm").addEventListener("submit", validateCreateAccount);

/**
 * validateCreateAccount() collects the user generated content from the form on the sign up page,
 *      it then sends the relevant informaiton to the respective helper methods in order to validate it.
 *      If any of the helper methods return a false, then an alert will appear on the page stating the fault,
 *      alternatively the user is directed to the home page.
 * 
 * @param {*} event - This is the event listener, so this method only executes when the form is submitted
 * @returns - Sends the user to the home page if all of the user generated content is valid, otherwise
 *      the user will remain on the sign up page.
 */
function validateCreateAccount(event){
    event.preventDefault();

    const email = validEmail(document.getElementById("email").value).trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if(!validEmail(email)){
        alert("Please enter a valid email address.");
        return;
    }
    
    if(!validPassword(password, confirmPassword)){
        alert("Passwords do not match. Please try again.");
        return;
    }

    window.location.href = "index.html"
}

/**
 * validEmail() confirms that the email value matches the format of a valid email.
 * 
 * @param {*} email - The email the user input
 * @returns - true if the format of the user inputted email matches the format of a valid email, otherwise false
 */
function validEmail(email){
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      return false;
    }

    return true;
}

/**
 * validPassword() confirms whether or not if the password and confirmPassword values are equal, and 
 *      if the password meets security standards.
 * 
 * @param {*} password - The first password the user inputs in the password input
 * @param {*} confirmPassword - The second password the user inputs in password input
 * @returns - true if the password length is greater than or equal to 8 and matches confirmPassword 
 */
function validPassword(password, confirmPassword){
    return password.length >= 8 && password === confirmPassword;
}