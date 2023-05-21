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

        const files = fs.readdirSync(resolve(__dirname + '/../../public/assets/images/avatars'));

        let max = files.length - 1;
        let min = 0;

        let index = Math.round(Math.random() * (max - min) + min);

        return files[index];

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


class Message{

    constructor(sender, date, messageContent) {
        this.#sender = sender;
        this.#date = date;
        this.#messageContent = messageContent;
    }

    sender(){
        return this.#sender;
    }

    date(){
        return this.#date;
    }

    dateString(){
        let dt = new Date(this.#date);
        let hours = dt.getHours();
        let mins = dt.getMinutes();
        return `${hours}:${("0" + mins).slice(-2)}`;
    }

    content() {
        return this.#messageContent;
    }

    static fromObject(obj){
        return new Message(obj.sender, obj.date, obj.content);
    }

    toJSON(){

        return {
            'sender': this.#sender,
            'date': this.#date,
            'content': this.#messageContent
        };

    }

    #sender = ""
    #date = Date.now();
    #messageContent = "";


}

class MessageChannel {

    static TYPE_DIRECT = 'Direct';
    static TYPE_GROUP = 'Group';
    static TYPE_PUBLIC = 'Public';

    constructor(name, type) {

        if (type !== MessageChannel.TYPE_GROUP &&
            type !== MessageChannel.TYPE_DIRECT &&
            type !== MessageChannel.TYPE_PUBLIC){

            throw new Error('Invalid group type provided!');

        }

        this.#name = name;
        this.#type = type;
        this.#id = randomBytes(32).toString('hex');

    }

    addUser(username) {
        this.#users.add(username);
    }

    removeUser(username) {
        this.#users.delete(username);
    }

    hasAccess(username){
        return this.#users.has(username) || this.#type === MessageChannel.TYPE_PUBLIC;
    }

    channelName(){
        return this.#name;
    }

    channelId(){
        return this.#id;
    }

    members(){
        return Array.from(this.#users);
    }

    messages(){
        return Array.from(this.#messages);
    }

    postMessage(username, messageContent){

        if(!this.hasAccess(username)) return false;

        this.#messages.add(new Message(username, Date.now(), messageContent));

        return true;

    }

    type() {
        return this.#type;
    }

    static fromObject(obj){

        let channel= new MessageChannel(obj.name, obj.type);

        channel.#id = obj.id;
        channel.#users = new Set(obj.users);
        channel.#messages = new Set();

        obj.messages.forEach(message => {
            channel.#messages.add(Message.fromObject(message));
        })

        return channel;

    }

    toJSON(){

        return {
            'name': this.#name,
            'type': this.#type,
            'id': this.#id,
            'users': Array.from(this.#users),
            'messages': Array.from(this.#messages)
        };

    }

    #name = "";
    #type = "";
    #id = "";
    #users = new Set();
    #messages = new Set();

}

class Database {

    #userDatabase = [];
    #friendsDatabase = {};
    #friendRequests = {};
    #messageChannels = new Set();

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

        });

        fs.readFile(resolve(__dirname + '/../../config/friends-data.json'),'utf8', (err, data) => {

            if(err) return;

            this.#friendsDatabase = JSON.parse(data);

        });

        fs.readFile(resolve(__dirname + '/../../config/friend-requests.json'),'utf8', (err, data) => {

            if(err) return;

            this.#friendRequests = JSON.parse(data);

        });

        fs.readFile(resolve(__dirname + '/../../config/channel-data.json'),'utf8', (err, data) => {

            if(err) {

                this.#messageChannels = new Set();
                this.#messageChannels.add(new MessageChannel('Public Channel', MessageChannel.TYPE_PUBLIC));
                this.saveConfig();
                return;

            }

            let list = JSON.parse(data);

            list.forEach(obj => {

                try{
                    this.#messageChannels.add(MessageChannel.fromObject(obj));
                }
                catch (e){
                    console.log(e);
                }

            });

        });

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

        fs.writeFile(resolve(__dirname + '/../../config/channel-data.json'), JSON.stringify(Array.from(this.#messageChannels), null, '\t'), 'utf8', (err) =>{

            if(err){
                console.log(err);
            }

        });

        fs.writeFile(resolve(__dirname + '/../../config/friends-data.json'), JSON.stringify(this.#friendsDatabase, null, '\t'), 'utf8', (err) =>{

            if(err){
                console.log(err);
            }

        });

        fs.writeFile(resolve(__dirname + '/../../config/friend-requests.json'), JSON.stringify(this.#friendRequests, null, '\t'), 'utf8', (err) =>{

            if(err){
                console.log(err);
            }

        });


    }

    avatar(username) {

        for (let i = 0; i < this.#userDatabase.length; ++i){

            const user = this.#userDatabase[i];

            if (user.userName().toLowerCase() === username.toLowerCase()){
                return user.avatarPath();
            }

        }

        return 'avatar-1.png';

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

    getUserChannels(username) {

        let arr = [];

        this.#messageChannels.forEach(channel => {

            if(channel.hasAccess(username)){
                arr.push(channel);
            }

        });

        return arr;

    }

    getChannel(username, channelId) {

        let channel = null;

        this.#messageChannels.forEach(ch => {
            if(ch.channelId() === channelId){
                channel = ch;
            }
        })

        if(channel){
            return channel.hasAccess(username) ? channel : null;

        }

        return null;

    }

    postMessage(username, channelId, content){

        let channel = null;

        this.#messageChannels.forEach(ch => {
            if(ch.channelId() === channelId){
                channel = ch;
            }
        })

        if(channel && channel.postMessage(username, content)){
            this.saveConfig();
            return true;
        }

        return false;

    }

    areFriends(username, to){

        if(!this.#friendsDatabase[username] || !this.#friendsDatabase[to]) return false;
        return this.#friendsDatabase[username].includes(to) && this.#friendsDatabase[to].includes(username);

    }

    getFriends(username){

        const list = [];

        this.#userDatabase.forEach(user => {
            if(this.areFriends(username, user.userName())){
                list.push(user.userName());
            }
        })

        return list;

    }

    getFriendRequests(username){

        const list = [];

        const keys = Object.keys(this.#friendRequests);
        const values = Object.values(this.#friendRequests);

        for(let i = 0; i < keys.length; ++i){
            if (values[i].includes(username)){
                list.push(keys[i]);
            }
        }

        return list;

    }

    getFriendChannel(user1, user2) {

        if(!this.areFriends(user1, user2)) return null;

        let channel = null;

        this.#messageChannels.forEach(ch =>{
            if(ch.type() === MessageChannel.TYPE_DIRECT){
                let members = ch.members();
                if(members.includes(user1) && members.includes(user2)){
                    channel = ch;
                }
            }
        });

        if(channel) return channel;

        channel = new MessageChannel('Direct Message', MessageChannel.TYPE_DIRECT);
        channel.addUser(user1);
        channel.addUser(user2);

        this.#messageChannels.add(channel);

        return channel;

    }

    sendFriendRequest(username, to){

        if(username.toLowerCase() === to.toLowerCase()) throw new Error('Cannot send an invite to yourself.');

        if(!this.userExists(username) || !this.userExists(to)) throw new Error('Invalid user.');

        if(this.areFriends(username, to)) throw new Error('You are already friends.');

        if(this.#friendRequests[username] && this.#friendRequests[username].includes(to)) throw new Error('You already sent a request.');

        if (this.acceptFriendRequest(username, to)) return true;

        if(!this.#friendRequests[username]){
            this.#friendRequests[username] = [];
        }

        this.#friendRequests[username].push(to);

        this.saveConfig();

        return true;

    }

    acceptFriendRequest(username, from) {

        if(!this.#friendRequests[from] || !this.#friendRequests[from].includes(username)) return false;

        this.#friendRequests[from].splice(this.#friendRequests[from].indexOf(username), 1);

        if(!this.#friendsDatabase[username]){
            this.#friendsDatabase[username] = [];
        }

        if(!this.#friendsDatabase[from]){
            this.#friendsDatabase[from] = [];
        }

        this.#friendsDatabase[username].push(from);
        this.#friendsDatabase[from].push(username);

        this.saveConfig();

        return true;

    }

    denyFriendRequest(username, from) {

        if(!this.#friendRequests[from] || !this.#friendRequests[from].includes(username)) return false;

        this.#friendRequests[from].splice(this.#friendRequests[from].indexOf(username), 1);

        return true;

    }

}

module.exports = {

    PasswordError: PasswordError,
    UserExistsError: UserExistsError,
    InvalidUserError: InvalidUserError,
    User: User,
    Database: Database

};