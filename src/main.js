const http = require('http')
const express = require('express');
const { Server } = require('socket.io');
const Utilities = require("./utils/utilities");
const { Database } = require('./database/database')
const serveStatic = require("serve-static");
const cookieParser = require('cookie-parser');
const {resolve} = require("path");

const app = express();
const httpServer = http.Server(app);
const socketServer = new Server(httpServer);
const database = new Database();

app.use(serveStatic(resolve(__dirname + '/../public')));
app.use(cookieParser());

app.get('/', (request, response) => {

    const user = database.authenticate(request.cookies['session_cookie']);

    if (user){
        Utilities.renderEJS('home-auth.ejs', response, { username: user.userName(), avatar: user.avatarPath() });
    }
    else{
        Utilities.renderEJS('home-public.ejs', response);
    }

});

app.get('/signin', (request, response) => {

    if (database.authenticate(request.cookies['session_cookie'])){
        response.redirect('/');
        return;
    }

    Utilities.renderEJS('signin.ejs', response);

});

app.get('/signout', (request, response) => {

    database.deauthenticate(request.cookies['session_cookie']);

    response.redirect('/');

});

app.get('/signup', (request, response) => {

    if (database.authenticate(request.cookies['session_cookie'])){
        response.redirect('/');
        return;
    }

    Utilities.renderEJS('signup.ejs', response);

});

app.get('/refresh-chat', (request, response) => {

    let cookie = request.cookies['session_cookie'];
    let user = database.authenticate(cookie);
    let channelParam = request.query.channel;

    if (user && channelParam){

        let channel = database.getChannel(user.userName(), channelParam);
        let messages = channel.messages();
        let avatars = [];

        messages.forEach(message => {
            avatars.push(database.avatar(message.sender()));
        });

        if(channel){

            Utilities.renderEJS('messages.ejs', response, {
                username: user.userName(),
                messages: messages,
                avatars: avatars
            })

            return;

        }

    }

    Utilities.renderEJS('unauthorized.ejs', response);

});

app.get('/fetch-chat-view', (request, response) => {

    Utilities.renderEJS('chat-view.ejs', response);

});

app.get('/fetch-friends-view', (request, response) => {

    let cookie = request.cookies['session_cookie'];
    let user = database.authenticate(cookie);

    if (user){

        const username = user.userName();

        let friends = database.getFriends(username);
        let requests = database.getFriendRequests(username);

        let avatars = [];
        let avatars2 = [];

        friends.forEach(name => {
            avatars.push(database.avatar(name));
        })

        requests.forEach(name => {
            avatars2.push(database.avatar(name));
        })

        let friendData = { "usernames": friends, "avatars": avatars}
        let requestData = { "usernames": requests, "avatars": avatars2}

        Utilities.renderEJS('friends-view.ejs', response, { "friends": friendData, "requests": requestData });

        return;

    }

    response.end();

});

app.get('/fetch-channels-view', (request, response) => {

    let cookie = request.cookies['session_cookie'];
    let user = database.authenticate(cookie);

    if (user){

        const username = user.userName();

        let channels = database.getUserChannels(username);

        let data = [];

        channels.forEach(channel => {

            let members = channel.members();
            let name = channel.channelName();
            let icon = null;

            if(channel.type() === 'Direct'){
                members.splice(members.indexOf(username), 1);
                let other = members[0];
                icon = database.avatar(other);
                name = other;
            }

            data.push({ name: name, id: channel.channelId(), icon: icon})

        })

        Utilities.renderEJS('channels-view.ejs', response, { "channels": data });

        return;

    }

    response.end();

});

app.get('*', (request, response) => {
    response.redirect('/');
});

httpServer.listen(8080, () => {
    console.log("Server listening on port 8080");
});

socketServer.listen(httpServer, {cookie: true});

socketServer.sockets.on('connection', (socket) => {

    socket.on('signup', (username, password) => {

        try{
            socket.emit('auth_cookie', database.createUser(username, password));
            socket.emit('redirect', '/');
        }
        catch (e){
            console.log(e);
        }

    });

    socket.on('check_user', (user) => {
        socket.emit('user_result', !database.userExists(user), user);
    });

    socket.on('signin', (username, password) => {

        try{
            socket.emit('auth_cookie', database.trySignIn(username, password));
            socket.emit('redirect', '/');
            database.saveConfig();
        }
        catch (e){
            socket.emit('invalid_auth');
        }

    });

    socket.on('disconnect', () => {

    });

    socket.on('post-message', (cookie, channel, message) => {

        let user = database.authenticate(cookie);

        if(user){

            let username = user.userName();

            if(database.postMessage(username, channel, message)){
                socketServer.emit('message-posted', channel);
            }

        }

    });

    socket.on('add-friend', (cookie, friend) => {

        let user = database.authenticate(cookie);

        if(user){

            let username = user.userName();

            try{
                database.sendFriendRequest(username, friend)
                socket.broadcast.emit('request-sent');
                socket.emit('request-succeeded');
            }
            catch (error){
                socket.emit('request-failed', error.message);
            }

        }

    });

    socket.on('accept-friend', (cookie, friend) => {

        let user = database.authenticate(cookie);

        if(user){

            let username = user.userName();
            database.acceptFriendRequest(username, friend);
            socketServer.emit('friend-added');

        }

    });

    socket.on('deny-friend', (cookie, friend) => {

        let user = database.authenticate(cookie);

        if(user){

            let username = user.userName();

            if(database.denyFriendRequest(username, friend)){
                socketServer.emit('request-sent');
            }

        }

    });

    socket.on('get-friend-channel', (cookie, friend) => {

        let user = database.authenticate(cookie);

        if(user){

            let username = user.userName();
            let channel = database.getFriendChannel(username, friend);

            if(channel){
                socket.emit('friend-channel', channel.channelId());
            }

        }

    })

});