document.addEventListener('DOMContentLoaded', () => {

    // By default, buttons are disabled
    document.querySelectorAll('button').forEach(button => {
        button.disabled = true;
    });

    // Enable change-display-name button only if there is text in the input field
    document.querySelector('#displayName').onkeyup = () => {
        document.querySelectorAll('.displayButton').forEach(button => {
            if (document.querySelector('#displayName').value.length > 0)
                button.disabled = false;
            else
                button.disabled = true;
        });
    };

    // Enable message button only if there is text in the input field
    document.querySelector('#message').onkeyup = () => {
        if (document.querySelector('#message').value.length > 0)
            document.querySelector('#messageButton').disabled = false;
        else
            document.querySelector('#messageButton').disabled = true;
    };

    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // When connected, configure buttons
    socket.on('connect', () => {

        // When a user submits a message
        document.querySelector('#newMessage').onsubmit = function(event) {
            // Retrieve message
            const message = document.querySelector('#message').value;
            // Alert the server of a message-has-been-submitted event
            socket.emit('submit message', {'message': message});
            // Clear input field and disable button again
            document.querySelector('#message').value = '';
            document.querySelector('#messageButton').disabled = true;
            // Stop form from submitting
            event.preventDefault();
        };

        // When a user submits a display name
        document.querySelector('#newDisplayName').onsubmit = function(event) {
            // Retrieve display name
            const displayName = document.querySelector('#displayName').value;
            // Alert the server of the display name change event
            socket.emit('submit display name', {'displayName': displayName});
            // Clear input field and disable button again
            document.querySelector('#displayName').value = '';
            document.querySelectorAll('.displayButton').forEach(button => {
                button.disabled = true;
            });
            // Stop form from submitting
            event.preventDefault();
        };
    });

    // When a new message is announced, add it to the unordered list
    socket.on('announce message', message => {
        const li = document.createElement('li');
        li.innerHTML = `${message.displayName} [${message.timestamp}]: ${message.text}`;
        document.querySelector('#messages').append(li);
    });

    // When a new display name is made
    socket.on('announce display name', () => {
        // Change the text on the submit button
        document.getElementById('createNameButton').innerHTML = "Change Display Name";
        // Alert user that display name was changed
        alert('Display name was changed successfully.');
    });
});
