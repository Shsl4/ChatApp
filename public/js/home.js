const inputArea = element('input-area');

function refreshChat() {

    const request = new XMLHttpRequest();

    request.onload = function() {
        document.getElementById("home-main-content").innerHTML = this.responseText;
    }

    request.open("GET", "/refresh-chat");
    request.send();

}

socket.on('message-posted', () => {
    refreshChat();
});

function getCookie(name) {

    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();

}

inputArea.addEventListener('keydown', event => {

    if (event.key === 'Enter') {

        if(!event.shiftKey){

            event.preventDefault();

            let cookie = getCookie('session_cookie');
            let mainChannel = '4d325c6e12f92bb17b1ea223e6a753c6d41c72a7023a14cac57a7c51d4491339';

            socket.emit('post-message', cookie, mainChannel, inputArea.value);

            inputArea.value = "";

            refreshInputArea();

        }

    }

});

function refreshInputArea(){

    inputArea.style.height = 'auto';

    if (inputArea.clientHeight >= inputArea.scrollHeight) {
        inputArea.style.height = `6pt`;
    }

    inputArea.style.height = `${inputArea.scrollHeight}px`;

}

window.addEventListener('DOMContentLoaded', () => {

    refreshInputArea();
    refreshChat();

});
