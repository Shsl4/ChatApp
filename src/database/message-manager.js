const { randomBytes } = require('crypto');
const fs = require("fs");
const {resolve} = require("path");

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
        let st = new Date(this.#date).toLocaleTimeString();
        return st.substring(0, st.lastIndexOf(':'));
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

class MessageManager {

    constructor() {

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

    getUserChannels(username) {

        let arr = [];

        this.#messageChannels.forEach(channel => {

            if(channel.hasAccess(username)){
                arr.push(channel);
            }

        });

        return arr;

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

    saveConfig(){

        fs.writeFile(resolve(__dirname + '/../../config/channel-data.json'), JSON.stringify(Array.from(this.#messageChannels), null, '\t'), 'utf8', (err) =>{

            if(err){
                console.log(err);
            }

        });

    }

    #messageChannels = new Set();

}

module.exports = {

    MessageManager: MessageManager,
    MessageChannel: MessageChannel,
    Message: Message

};