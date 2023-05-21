const CHANNEL_VIEW = 'channel';
const FRIEND_VIEW = 'friends';

let inputArea;
let currentChannel = '';
let cookie = getCookie("session_cookie");
let currentView = 'INVALID';

function getCookie(name) {

    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();

}

function refreshChat() {

    if(!currentChannel) return;

    const request = new XMLHttpRequest();

    request.onload = function() {

        document.getElementById("chat-main-content").innerHTML = this.responseText;
        inputArea.disabled = false;

    }

    request.open("GET", "/refresh-chat?channel=" + currentChannel);
    request.send();

}

function fetchChatView() {

    const request = new XMLHttpRequest();

    request.onload = function() {

        document.getElementById("home-main").innerHTML = this.responseText;
        setupInputArea();
        refreshChat();

    }

    request.open("GET", "/fetch-chat-view");
    request.send();

}


function fetchFriendsView() {

    const request = new XMLHttpRequest();

    request.onload = function() {

        document.getElementById("home-mid").innerHTML = this.responseText;
    }

    request.open("GET", "/fetch-friends-view");
    request.send();

}


function fetchChannelsView() {

    const request = new XMLHttpRequest();

    request.onload = function() {

        document.getElementById("home-mid").innerHTML = this.responseText;

        let cards = document.querySelectorAll('.channel-card');

        cards.forEach(card => {

            if(card.id === currentChannel){
                card.classList.add('animated-gradient');
            }

            card.addEventListener('click', () => {

                document.querySelector('.animated-gradient')?.classList.remove('animated-gradient');
                card.classList.add('animated-gradient');

            });

        })

    }

    request.open("GET", "/fetch-channels-view");
    request.send();

}

function setupInputArea() {

    inputArea = element('input-area');

    inputArea.addEventListener('keydown', event => {

        if (event.key === 'Enter') {

            if(!event.shiftKey){

                event.preventDefault();

                socket.emit('post-message', cookie, currentChannel, inputArea.value);

                inputArea.value = "";

                refreshInputArea();

            }

        }

    });

    inputArea.disabled = true;

    refreshInputArea();

}

function refreshInputArea(){

    inputArea.style.height = 'auto';

    if (inputArea.clientHeight >= inputArea.scrollHeight) {
        inputArea.style.height = `6pt`;
    }

    inputArea.style.height = `${inputArea.scrollHeight}px`;

}

function sendFriendRequest(){

    const field = element("add-friend");

    if(field){
        socket.emit('add-friend', cookie, field.value);
    }

}

function acceptFriend(name){
    socket.emit('accept-friend', cookie, name);
    fetchFriendsView();
}

function denyFriend(name){
    socket.emit('deny-friend', cookie, name);
}

function openFriendChannel(friend) {
    socket.emit('get-friend-channel', cookie, friend);
}

function openChannel(channelId){

    currentChannel = channelId;
    refreshChat();

}

function refreshMidView(view){

    if(currentView === view) { return; }

    if(view === CHANNEL_VIEW){
        fetchChannelsView();
    }
    else{
        fetchFriendsView();
    }

    currentView = view;

}

function openChannelsTab(){
    refreshMidView(CHANNEL_VIEW);
}

function openFriendsTab(){
    refreshMidView(FRIEND_VIEW);
}

window.addEventListener('DOMContentLoaded', () => {
    openFriendsTab();
    fetchChatView();
});

socket.on('message-posted', (channel) => {
    if(channel === currentChannel){
        refreshChat();
    }
});

socket.on('friend-channel', (channelId) => {
    currentChannel = channelId;
    openChannelsTab();
    refreshChat();
});

socket.on('request-sent', () => {

    if(currentView === FRIEND_VIEW){
        fetchFriendsView();
    }

});

socket.on('request-succeeded', () => {

    let elem = element('request-info');
    elem.innerText = 'Successfully sent invite.';
    elem.style.display = 'block';

});

socket.on('friend-added', () => {
    if(currentView === FRIEND_VIEW){
        fetchFriendsView();
    }
});

socket.on('request-failed', (reason) => {

    let elem = element('request-info');
    elem.innerText = reason;
    elem.style.display = 'block';

});

socket.on('connect', () => {
    socket.emit('ping', cookie);
});

socket.on('new-connection', () => {

    if(currentView === CHANNEL_VIEW){
        fetchChannelsView();
    }
    else{
        fetchFriendsView();
    }

});