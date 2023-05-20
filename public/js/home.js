const inputArea = element('input-area');

function refreshInputArea(){

    inputArea.style.height = 'auto';

    if (inputArea.clientHeight >= inputArea.scrollHeight) {
        inputArea.style.height = `6pt`;
    }

    inputArea.style.height = `${inputArea.scrollHeight}px`;

}

window.addEventListener('DOMContentLoaded', refreshInputArea);
