var usernameVerified = false;

const usernameField = element('username');
const usernameStatus = element('username-status');
const usernameStatusLabel = element('username-status-label');
const passwordField = element('password');
const passwordVerifyField = element('password-verify');
const passwordMismatchField = element('password-mismatch');
const signupButton = element('signup');

function refreshUsernameStatus(){

    usernameVerified = false;

    if(validUsername()){
        usernameStatus.style.display = 'block';
    }
    else{
        usernameStatus.style.display = 'none';
    }

    socket.emit('check_user', usernameField.value);

}

function invokeRegister(){
    register(usernameField.value, passwordField.value);
}

socket.on('user_result', (success, user) => {

    if (usernameField.value !== user){
        usernameVerified = false;
        return;
    }

    const successString = 'This username is available.';
    const errorString = 'This username is unavailable.';

    usernameStatus.style.color = success ? successColor : errorColor;
    usernameStatusLabel.innerText = success ? successString : errorString;

    usernameVerified = success;

    refreshButton();

});

function passwordErrors(pass){

    const list = [];

    if(pass.length < 8) list.push(1);

    if(pass.replace(/[^0-9]/g,"").length < 1) list.push(2);

    if(pass.replace(/[^A-Z]/g, '').length < 1) list.push(3);

    if(pass.replace(/[a-zA-Z0-9]/g,'').length < 1) list.push(4);

    if(usernameField.value && pass.toLowerCase().includes(usernameField.value.toLowerCase())) list.push(5);

    return list;

}

function usernameErrors(user){

    const list = [];

    if(!user || user.length < 6 || user.length > 16) list.push(1);

    if(user.replace(/[a-zA-Z0-9_-]/g,'')) list.push(2);

    return list;

}

function validPassword(){
    return passwordErrors(passwordField.value).length === 0;
}

function validUsername(){
    return usernameErrors(usernameField.value).length === 0;
}

function passwordsMatch(){

    if (!passwordField.value || !passwordVerifyField.value) return false;

    return passwordField.value === passwordVerifyField.value;

}

function refreshPasswordMismatchField(){
    const color = passwordVerifyField.value && passwordField.value ? (passwordsMatch() ? successColor : errorColor) : idleColor;
    passwordMismatchField.style.display = passwordsMatch() || !(passwordVerifyField.value && passwordField.value) ? 'none' : 'block';
    setBorderColor(passwordVerifyField, color);
}

function refreshPasswordRequirements() {

    let res = passwordErrors(passwordField.value);

    for (let i = 1; i < 6; ++i){
        const id = 'password-requirement-' + i;
        element(id).style.color = res.includes(i) && passwordField.value ? errorColor : lightGrayColor;
    }

}

function refreshUsernameRequirements() {

    let res = usernameErrors(usernameField.value);

    for (let i = 1; i < 3; ++i){
        const id = 'user-requirement-' + i;
        element(id).style.color = res.includes(i) && usernameField.value ? errorColor : lightGrayColor;
    }

}

function refreshUsernameField() {

    if(!usernameField.value){
        setBorderColor(usernameField, idleColor);
    }
    else{
        setBorderColor(usernameField, validUsername() ? successColor : errorColor);
    }

    refreshUsernameRequirements();

}

function refreshPasswordField() {

    if(!passwordField.value){
        setBorderColor(passwordField, idleColor);
    }
    else{
        setBorderColor(passwordField, validPassword() ? successColor : errorColor);
    }

    refreshPasswordRequirements();

}

function refreshPasswordVerifyField() {

    if(!passwordVerifyField.value){
        setBorderColor(passwordVerifyField, idleColor);
    }
    else{
        setBorderColor(passwordVerifyField, passwordsMatch() ? successColor : errorColor);
    }

    refreshPasswordMismatchField();

}

function refreshElements() {

    refreshUsernameField();
    refreshPasswordField();
    refreshPasswordVerifyField();
    refreshButton();

}

function refreshButton(){

    if(validUsername() && validPassword() && passwordsMatch() && usernameVerified){
        signupButton.removeAttribute('disabled');
    }
    else{
        signupButton.setAttribute('disabled', '');
    }

}

addEventListener("input", (event) => {

    refreshElements();

    if(event.target === usernameField){
        refreshUsernameStatus();
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
        if(passwordField.value){
            passwordVerifyField.focus();
        }
    }

});

passwordVerifyField.addEventListener("keypress", (event) => {

    if (event.key === "Enter") {
        event.preventDefault();
        if(validUsername() && validPassword() && passwordsMatch() && usernameVerified){
            invokeRegister();
        }
    }

});