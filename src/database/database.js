const { createHash, randomBytes } = require('crypto');
const fs = require('fs');
const {resolve} = require("path");

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
        this.#avatar = User.#randomAvatar();
    }

    static #randomAvatar(){

        const files = fs.readdirSync(resolve(process.cwd() + "/public/assets/images/avatars"));

        let max = files.length - 1;
        let min = 0;

        let index = Math.round(Math.random() * (max - min) + min);
        let file = files[index];

        return file;

    }

    static fromObject(obj){

        let user = new User(obj.user, '');
        user.#hashedPassword = obj.hashedPassword;
        user.#userSalt = obj.userSalt;
        user.#sessionCookie = obj.sessionCookie;
        user.#expiryDate = obj.expiryDate;
        user.#avatar = obj.avatar;

        return user;

    }

    userName(){
        return this.#user;
    }

    avatarPath() {
        return this.#avatar;
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

        this.clearSessionCookie();

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
    #avatar = "";

    static #generateSalt() {
        return randomBytes(8).toString('hex');
    }

    toJSON(){
        return {
            'user': this.#user,
            'userSalt': this.#userSalt,
            'hashedPassword': this.#hashedPassword,
            'sessionCookie': this.#sessionCookie,
            'expiryDate': this.#expiryDate.valueOf(),
            'avatar': this.#avatar
        };
    }
}

class Database {

    #userDatabase = [];

    constructor() {

        fs.readFile(resolve(__dirname + '/../../config/users.json'),'utf8', (err, data) => {

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

        if(this.userExists(username))
            throw new UserExistsError("A user named " + username + " already exists.");

        let new_user = new User(username, password);

        let cookie = new_user.generateSessionCookie();

        this.#userDatabase.push(new_user);

        this.saveConfig();

        return cookie;

    }

    trySignIn(username, password) {

        let user = this.#userDatabase.find(u => u.userName().toLowerCase() === username.toLowerCase());

        if (user == null) throw new InvalidUserError("The user named \'" + username + "\' does not exist.");

        if (!user.matches(password)) throw new PasswordError('Invalid password');

        let cookie = user.generateSessionCookie();

        this.saveConfig();

        return cookie;

    }

    authenticate(cookie){

        if (!cookie) return null;

        let user = this.#userDatabase.find(u => u.getSessionCookie() === cookie);

        return (!user) ? null : user;

    }

    deauthenticate(cookie){

        if (!cookie) return false;

        let user = this.#userDatabase.find(u => u.getSessionCookie() === cookie);

        if(user){
            user.clearSessionCookie();
            this.saveConfig();
            return true;
        }

        return false;

    }

    saveConfig(){

        fs.writeFile(resolve(__dirname + '/../../config/users.json'), JSON.stringify(this.#userDatabase, null, '\t'), 'utf8', (err) =>{

            if(err){
                console.log(err);
            }

        });

    }

    userExists(username) {

        for (let i = 0; i < this.#userDatabase.length; ++i){

            const user = this.#userDatabase[i];

            if (user.userName().toLowerCase() === username.toLowerCase()){
                return true;
            }

        }

        return false;

    }
}

module.exports = {

    PasswordError: PasswordError,
    UserExistsError: UserExistsError,
    InvalidUserError: InvalidUserError,
    User: User,
    Database: Database

};