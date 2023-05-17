const { createHash, randomBytes } = require('crypto');
const fs = require('fs');

class PasswordError extends Error {}

class InvalidUserError extends Error {}

class InvalidPasswordError extends Error {}

class UserExistsError extends Error {}

class User {

    constructor(user, password) {
        this.#user = user;
        this.#userSalt = User.#generateSalt();
        this.#hashedPassword = this.#hashString(password);
        this.#sessionCookie = null;
        this.#expiryDate = Date.now();
    }

    static fromObject(obj){

        let user = new User(obj.user, '');
        user.#hashedPassword = obj.hashedPassword;
        user.#userSalt = obj.userSalt;
        user.#sessionCookie = obj.sessionCookie;
        user.#expiryDate = obj.expiryDate;

        return user;

    }

    userName(){
        return this.#user;
    }

    generateSessionCookie() {
        this.#sessionCookie = randomBytes(128).toString('hex');
        this.#expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        return this.#sessionCookie;
    }

    clearSessionCookie(){
        this.#sessionCookie = null;
        this.#expiryDate = Date.now();
    }

    getSessionCookie(){

        if (Date.now() < this.#expiryDate){
            return this.#sessionCookie;
        }

        this.#sessionCookie = null;

        return null;

    }

    matches(password){
        return this.#hashString(password) === this.#hashedPassword;
    }

    #hashString(string) {
        return createHash('sha256').update(string + this.#userSalt).digest('hex');
    }

    #user = "";
    #userSalt = "";
    #hashedPassword = "";
    #sessionCookie = "";
    #expiryDate = Date.now();

    static #generateSalt() {
        return randomBytes(8).toString('hex');
    }

    toJSON(){
        return {
            'user': this.#user,
            'userSalt': this.#userSalt,
            'hashedPassword': this.#hashedPassword,
            'sessionCookie': this.#sessionCookie,
            'expiryDate': this.#expiryDate.valueOf()
        };
    }
}

class Database {

    #userDatabase = [];

    constructor() {

        fs.readFile('config/users.json','utf8', (err, data) => {

            if(err) return;

            let list = JSON.parse(data);

            list.forEach(obj => {

                try{
                    this.#userDatabase.push(User.fromObject(obj));
                }
                catch (e){
                    console.log(e);
                }

            });

        })

    }

    createUser(username, password){

        if (!username)
            throw new InvalidUserError('The user cannot be empty.');

        if (!password)
            throw new InvalidPasswordError('The password cannot be empty.');

        this.#userDatabase.forEach(user => {
            if (user.userName().toLowerCase() === username.toLowerCase()){
                throw new UserExistsError("A user named " + username + " already exists.");
            }
        });

        let new_user = new User(username, password);

        let cookie = new_user.generateSessionCookie();

        this.#userDatabase.push(new_user);

        this.saveConfig();

        return cookie;

    }

    tryLogin(username, password) {

        let user = this.#userDatabase.find(u => u.userName().toLowerCase() === username.toLowerCase());

        if (user == null) throw new InvalidUserError("The user named \'" + username + "\' does not exist.");

        if (!user.matches(password)) throw new PasswordError('Invalid password');

        let cookie = user.generateSessionCookie();

        this.saveConfig();

        return cookie;

    }

    authenticate(cookie){

        if (cookie == null) return null;

        let user = this.#userDatabase.find(u => u.getSessionCookie() === cookie);

        return (user === undefined) ? null : user;

    }

    deauthenticate(cookie){

        if (cookie == null) return false;

        let user = this.#userDatabase.find(u => u.getSessionCookie() === cookie);

        if(user){
            user.clearSessionCookie();
            this.saveConfig();
            return true;
        }

        return false;

    }

    saveConfig(){

        fs.writeFile('config/users.json', JSON.stringify(this.#userDatabase, null, '\t'), 'utf8', (err) =>{

            if(err){
                console.log(err);
            }

        });

    }

}

module.exports = {

    PasswordError: PasswordError,
    UserExistsError: UserExistsError,
    InvalidUserError: InvalidUserError,
    User: User,
    Database: Database

};