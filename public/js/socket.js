let socket = io("http://localhost:8080");

socket.on("connect", () => {
    console.log("Connected!");
});

socket.on('redirect', (page) => {
    window.location.replace("http://localhost:8080" + page);
});

socket.on('auth_cookie', cookie => {
    document.cookie = 'session_cookie=' + cookie;
});

function register(user, password){
    socket.emit('register', user, password);
}

function login(user, password){
    socket.emit('login', user, password);
}