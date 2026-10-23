/**
 * This is hoprefully a temporary file that will make a user object
 *      so it can be added to a list of users' valid emails and passwords.
 * 
 * POSSIBLY ONLY USED FOR PROOF OF CONCEPT
 */

export class User{
    constructor(id, email, passwordHash){
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
    }
}