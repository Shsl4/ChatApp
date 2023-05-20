const usernameField = element('username');
const passwordField = element('password');
const errorField = element('auth-error');
const button = element('signin');

var errorState = false;

function refreshButton(){

    if(usernameField.value && passwordField.value){
        button.removeAttribute('disabled');
    }
    else{
        button.setAttribute('disabled', '');
    }

}

function invokeSignIn(){
    signin(usernameField.value, passwordField.value);
}

socket.on('invalid_auth', () => {

    errorField.style.display = 'block';
    setBorderColor(usernameField, errorColor);
    setBorderColor(passwordField, errorColor);
    button.setAttribute('disabled', '');
    errorState = true;

});

addEventListener("input", (event) => {

    refreshButton();

    if(errorState){

        setBorderColor(usernameField, idleColor);
        setBorderColor(passwordField, idleColor);
        errorField.style.display = 'none';
        errorState = false;

    }

});

usernameField.addEventListener("keypress", (event) => {

    if (event.key === "Enter") {
        event.preventDefault();
        if(usernameField.value){
            passwordField.focus();
        }
    }

});

passwordField.addEventListener("keypress", (event) => {

    if (event.key === "Enter") {
        event.preventDefault();
        if(usernameField.value && passwordField.value){
            invokeSignIn();
        }
    }

});