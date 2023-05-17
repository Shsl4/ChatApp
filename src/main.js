const path = require("path");
const http = require('http')
const express = require('express');
const { Server } = require('socket.io');
const Utilities = require("./utils/utilities");
const { Database, User, UserExistsError} = require('./database/database')
const serveStatic = require("serve-static");
const cookieParser = require('cookie-parser');

const app = express();
const httpServer = http.Server(app);
const socketServer = new Server(httpServer);
const database = new Database();
let p = path.resolve(__dirname + '/../public')

app.use(serveStatic(p));
app.use(cookieParser());

app.get('/', (request, response) => {
    Utilities.renderEJS('index.ejs', response);
});

app.get('/login', (request, response) => {

    if (database.authenticate(request.cookies['session_cookie'])){
        response.redirect('/login_confirm');
        return;
    }

    Utilities.renderEJS('login.ejs', response);

});

app.get('/logout', (request, response) => {

    if (database.deauthenticate(request.cookies['session_cookie'])){
        response.redirect('/logout_confirm');
        return;
    }

    response.redirect('/');

});

app.get('/register', (request, response) => {

    if (database.authenticate(request.cookies['session_cookie'])){
        response.redirect('/login_confirm');
        return;
    }

    Utilities.renderEJS('register.ejs', response);

});

app.get('/login_confirm', (request, response) => {

    if (!database.authenticate(request.cookies['session_cookie'])){
        response.redirect('/login');
        return;
    }

    response.end("Logged in");

});

app.get('/logout_confirm', (request, response) => {

    response.end("Successfully logged out.");

});

app.get('*', (request, response) => {
    response.redirect('/');
});

httpServer.listen(8080, () => {
    console.log("Server listening on port 8080");
});

socketServer.listen(httpServer, {
    cookie: true
});

socketServer.sockets.on('connection', (socket) => {

    socket.on('register', (username, password) => {

        try{
            socket.emit('auth_cookie', database.createUser(username, password));
            socket.emit('redirect', '/login_confirm');
            database.saveConfig();
        }
        catch (e){
            console.log(e);
        }

    });

    socket.on('login', (username, password) => {

        try{
            socket.emit('auth_cookie', database.tryLogin(username, password));
            socket.emit('redirect', '/login_confirm');
            database.saveConfig();
        }
        catch (e){
            console.log(e);
        }

    });

    socket.on('disconnect', () => {

    });

});