const http = require('http')
const express = require('express');
const { Server } = require('socket.io');
const Utilities = require("./utils/utilities");
const { Database } = require('./database/database')
const { MessageManager } = require("./database/message-manager");
const serveStatic = require("serve-static");
const cookieParser = require('cookie-parser');
const {resolve} = require("path");

const app = express();
const httpServer = http.Server(app);
const socketServer = new Server(httpServer);
const database = new Database();
const messageManager = new MessageManager();

app.use(serveStatic(resolve(__dirname + '/../public')));
app.use(cookieParser());

app.get('/', (request, response) => {

    const user = database.authenticate(request.cookies['session_cookie']);

    if (user){
        Utilities.renderEJS('home_auth.ejs', response, { username: user.userName(), avatar: user.avatarPath() });
    }
    else{
        Utilities.renderEJS('home_public.ejs', response);
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

    if (user){

        let channels = messageManager.getUserChannels(user.userName());

        Utilities.renderEJS('messages.ejs', response, {
            username: user.userName(),
            messages: channels[0].messages()
        })

        return;

    }

    response.end("");

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

            if(messageManager.postMessage(username, channel, message)){
                socketServer.emit('message-posted');
            }

        }

    });

});