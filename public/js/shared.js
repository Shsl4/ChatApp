function cssVariable(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name);
}

function element(id){
    return document.getElementById(id);
}

function clearFocus() {
    document.activeElement.blur();
}

const successColor = cssVariable('--success-color');
const errorColor = cssVariable('--error-color');
const idleColor = cssVariable('--idle-color');
const lightGrayColor = cssVariable('--light-background');

function setBorderColor(elem, color){

    elem.classList.remove('error-border');
    elem.classList.remove('success-border');

    if(color === errorColor){
        elem.classList.add('error-border');
    }
    else if (color === successColor){
        elem.classList.add('success-border');
    }

}

let socket = io("http://localhost:8080");

socket.on('redirect', (page) => {
    window.location.assign("http://localhost:8080" + page);
});

socket.on('auth_cookie', cookie => {
    document.cookie = 'session_cookie=' + cookie + '; SameSite=strict';
});

function register(user, password){
    socket.emit('register', user, password);
}

function signin(user, password){
    socket.emit('signin', user, password);
}