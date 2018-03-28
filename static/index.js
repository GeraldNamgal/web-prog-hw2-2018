// Debugging tools:
var dict = {'currentChannel': localStorage.getItem('currentChannel'), 'displayName': localStorage.getItem('displayName'), 'sid': localStorage.getItem('sid')};
var channels = `channels: ${localStorage.getItem('channels')}`;

document.addEventListener('DOMContentLoaded', () => {
/* Client-specific code */

    // Global variables
    const defaultChannel = 'general';
    const defaultDisplayName = 'Anonymous';
    // Limits to how much user can type in
    const messageLimit = 500;
    const channelLimit = 30;
    const displayNameLimit = 30;


    // By default, buttons are disabled except for delete button
    document.querySelectorAll('button').forEach(button => {
        if (button.id != 'deleteButton')
            button.disabled = true;
    });

    // Enable display name button only if there is text in the input field
    document.querySelector('#displayName').onkeyup = () => {
        if (document.querySelector('#displayName').value.length > 0)
            document.querySelector('#displayNameButton').disabled = false;
        else
            document.querySelector('#displayNameButton').disabled = true;
    };

    // Enable message button only if there is text in the input field
    document.querySelector('#message').onkeyup = () => {
        if (document.querySelector('#message').value.length > 0)
            document.querySelector('#messageButton').disabled = false;
        else
            document.querySelector('#messageButton').disabled = true;
    };

    // Enable channel button only if there is text in the input field
    document.querySelector('#channelName').onkeyup = () => {
        if (document.querySelector('#channelName').value.length > 0)
            document.querySelector('#channelButton').disabled = false;
        else
            document.querySelector('#channelButton').disabled = true;
    };

/* Socket or client-server interface code starts here: */

    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // When connected, configure buttons
    socket.on('connect', () => {

        console.log('- When client first connects to server, local variables:');
        console.log(dict);
        console.log(channels);

        // Get client's session id
        socket.emit('submit get sid');

        // Synchronize the channels between client and server
        socket.emit('submit synchronize channels');

        console.log(`- After synchronize channels called, local channels:`);
        console.log(channels);

        // If user is new, take them to default channel, else take them to channel they were on previously
        if(!localStorage.getItem('currentChannel'))
            socket.emit('submit channel change', {'to': defaultChannel});
        else
            socket.emit('submit channel change', {'to': localStorage.getItem('currentChannel')});

        // When user first opens app give them a default display name if they don't already have one
        if(!localStorage.getItem('displayName'))
            localStorage.setItem('displayName', defaultDisplayName);

        // Change display name button accordingly
        if(localStorage.getItem('displayName') == defaultDisplayName)
            document.getElementById('displayNameButton').innerHTML = 'Create Display Name';
        else
            document.getElementById('displayNameButton').innerHTML = 'Change Display Name';

        // When a user submits a channel to create
        document.querySelector('#newChannel').onsubmit = function(event) {
            // Stop form from submitting
            event.preventDefault();
            // Retrieve channel name
            const channelName = document.querySelector('#channelName').value;
            if (channelName.length > channelLimit)
                alert(`Please enter a channel name up to ${channelLimit} characters in length.`);
            // Alert server of the create channel event
            else
                socket.emit('submit new channel', {'channelName': channelName});
            // Clear input field and disable button again
            document.querySelector('#channelName').value = '';
            document.querySelector('#channelButton').disabled = true;
        };

        // When a user submits a message
        document.querySelector('#newMessage').onsubmit = function(event) {
            // Stop form from submitting
            event.preventDefault();
            // Retrieve message
            const message = document.querySelector('#message').value;
            if (message.length > messageLimit)
                alert(`Please enter a message up to ${messageLimit} characters in length.`);
            // Alert the server of a message-has-been-submitted event
            else
                socket.emit('submit message', {'channelName': localStorage.getItem('currentChannel'), 'displayName': localStorage.getItem('displayName'), 'message': message, 'sid': localStorage.getItem('sid')});
            // Clear input field and disable button again
            document.querySelector('#message').value = '';
            document.querySelector('#messageButton').disabled = true;
        };

        // When a user submits a display name
        document.querySelector('#newDisplayName').onsubmit = function(event) {
            // Stop form from submitting
            event.preventDefault();
            // Retrieve display name
            const displayName = document.querySelector('#displayName').value;
            if (displayName.length > displayNameLimit)
                alert(`Please enter a display name up to ${displayNameLimit} characters in length.`);
            else {
                // Change the text on the submit button
                document.getElementById('displayNameButton').innerHTML = 'Change Display Name';
                // Add display name to local storage
                localStorage.setItem('displayName', displayName.trim());
                // Alert user that display name was changed
                alert('Display name was updated.');
            }
            // Clear input field and disable button again
            document.querySelector('#displayName').value = '';
            document.querySelector('#displayNameButton').disabled = true;
        };

        // When a user hits the Delete Message button
        document.querySelector('#deleteButton').onclick = function() {
            socket.emit('submit get messages to delete', {'channelName': localStorage.getItem('currentChannel'), 'sid': localStorage.getItem('sid')});
        };
    });

/* Responding-to-server code starts here: */

    // When a get sid is announced
    socket.on('announce get sid', data => {
        localStorage.setItem('sid', data['sid']);
    });

    // When synchronize channels is announced
    // (Code referenced from: https://www.kirupa.com/html5/storing_and_retrieving_an_array_from_local_storage.htm)
    socket.on('announce synchronize channels', data => {

        // Clear channels in list (in case refresh occurs, etc.) to avoid duplicating list on page
        document.querySelector('#channels').innerHTML = '';

        // Retrieve channels that are already in local storage
        var clientChannels = [];
        if (localStorage.getItem('channels')) {
            var retrievedData = localStorage.getItem('channels');
            // Convert retrieved data from local storage to an array
            clientChannels = JSON.parse(retrievedData);
        }

        // Declare an 'li' tag variable to put channels on page
        var li;

        // If there were channels in local storage
        if (clientChannels.length > 0) {
            // Populate list of channels from local storage to the page
            for (i = 0; i < clientChannels.length; i++) {
                li = document.createElement('li');
                li.innerHTML = `${clientChannels[i]}`;
                li.className = 'channelLink';
                const channelLinkName = clientChannels[i];
                li.onclick = function(event) {
                    // Stop form from submitting
                    event.preventDefault();
                    socket.emit('submit channel change', {'from': localStorage.getItem('currentChannel'), 'to': channelLinkName});
                };
                document.querySelector('#channels').append(li);
            }

            // If there are client channels that aren't on server, create them on server
            for (i = 0; i < clientChannels.length; i++) {
                if (!data['serverChannels'].includes(clientChannels[i]))
                    socket.emit('submit new channel', {'channelName': clientChannels[i]});
            }
        }

        // If there are channels on the server that we received back
        if (data['serverChannels'].length > 0) {
            // If there are channels on server that aren't on client, add them to client channels and to page
            for (i = 0; i < data['serverChannels'].length; i++) {
                if (!clientChannels.includes(data['serverChannels'][i])) {
                    // Add channel to list of channels on page
                    li = document.createElement('li');
                    li.innerHTML = `${data['serverChannels'][i]}`;
                    li.className = 'channelLink';
                    const channelLinkName = data['serverChannels'][i];
                    li.onclick = function(event) {
                        // Stop form from submitting
                        event.preventDefault();
                        socket.emit('submit channel change', {'from': localStorage.getItem('currentChannel'), 'to': channelLinkName});
                    };
                    document.querySelector('#channels').append(li);
                    // Add channel to client channels list
                    clientChannels.push(data['serverChannels'][i]);
                }
            }
        }
        // Set clientChannels list to local storage in string (i.e., valid) form
        localStorage.setItem('channels', JSON.stringify(clientChannels));
    });

    // When a new channel is made
    socket.on('announce new channel', data => {
        var clientChannels = [];
        if (localStorage.getItem('channels')) {
            var retrievedData = localStorage.getItem('channels');
            clientChannels = JSON.parse(retrievedData);
        }

        // If there are channels in local storage
        if (clientChannels.length > 0) {
            // If channel is new to client
            if (!clientChannels.includes(data['channelName'])) {
                // Add channel to client channels list
                clientChannels.push(data['channelName']);
                // Set clientChannels list to local storage
                localStorage.setItem('channels', JSON.stringify(clientChannels));
                // Add channel to list of channels displayed on page
                const li = document.createElement('li');
                li.innerHTML = `${data['channelName']}`;
                li.className = 'channelLink';
                const channelLinkName = data['channelName'];
                li.onclick = function(event) {
                    // Stop form from submitting
                    event.preventDefault();
                    socket.emit('submit channel change', {'from': localStorage.getItem('currentChannel'), 'to': channelLinkName});
                };
                document.querySelector('#channels').append(li);
            }
        }
    });

    // When a channel change occurs
    socket.on('announce channel change', data => {
        // Clear messages in list from last channel (and in case refresh occurs, etc. to avoid duplicating them on page)
        document.querySelector('#messages').innerHTML = '';
        // Change the user's current channel in local storage
        localStorage.setItem('currentChannel', data['channelName']);
        // Change channel title in heading
        document.querySelector('#channelTitle').innerHTML = data['channelName'];
        // Repopulate messages with those from new channel
        var li;
        for (i = 0; i < data['messageList'].length; i++) {
            li = document.createElement('li');
            li.innerHTML = `<span class='screenname'>${data['messageList'][i].displayName}</span> [${data['messageList'][i].timestamp}]: ${data['messageList'][i].text}`;
            li.className = 'singleMessage';
            document.querySelector('#messages').append(li);
        }
    });

    // When a new message is announced
    socket.on('announce message', data => {
        const li = document.createElement('li');
        li.innerHTML = `<span class='screenname'>${data['message'].displayName}</span> [${data['message'].timestamp}]: ${data['message'].text}`;
        li.className = 'singleMessage';
        document.querySelector('#messages').append(li);
    });

    // When a get messages to delete is announced
    socket.on('announce get messages to delete', data => {

        // If there were messages returned
        if (data['messageList'].length > 0) {

            // Disable the delete message buttons
            document.querySelector('#deleteButton').disabled = true;

            // List the user's messages
            document.querySelector('#deleteHeading').innerHTML = `<span id='deleteDirections'>Click on a message to delete it from chat:</span>`;
            var li;
            for (i = 0; i < data['messageList'].length; i++) {
                li = document.createElement('li');
                li.innerHTML = `<span class='screenname'>${data['messageList'][i].displayName}</span> [${data['messageList'][i].timestamp}]: ${data['messageList'][i].text}`;
                li.className = 'deleteMessage';
                const msgID = data['messageList'][i].id;
                li.onclick = function(event) {
                    // Stop form from submitting
                    event.preventDefault();
                    socket.emit('submit delete message', {'channelName': localStorage.getItem('currentChannel'), 'msgID': msgID});
                    // Clear messages to delete from screen
                    document.querySelector('#deleteHeading').innerHTML = '';
                    document.querySelector('#deletees').innerHTML = '';
                    // Re-enable delete message button
                    document.querySelector('#deleteButton').disabled = false;
                };
                document.querySelector('#deletees').append(li);
            }

            // Create a return link back from the 'delete messages' screen
            li = document.createElement('li');
            li.innerHTML = `<span id='deleteReturnLink'>Click here</span> to return.`;
            li.id = 'deleteReturn';
            li.onclick = function(event) {
                // Stop form from submitting
                event.preventDefault();
                // Clear messages to delete from screen
                document.querySelector('#deleteHeading').innerHTML = '';
                document.querySelector('#deletees').innerHTML = '';
                // Re-enable delete message button
                document.querySelector('#deleteButton').disabled = false;
            };
            document.querySelector('#deletees').append(li);
        }

        // If there were no messages returned from the server
        else {
            alert('You have no messages to delete from this session.');
        }
    });

    // When a delete message is announced
    socket.on('announce delete message', data => {
        // Clear old messages from page
        document.querySelector('#messages').innerHTML = '';
        // Repopulate messages with deleted messages removed
        var li;
        for (i = 0; i < data['messageList'].length; i++) {
            li = document.createElement('li');
            li.innerHTML = `<span class='screenname'>${data['messageList'][i].displayName}</span> [${data['messageList'][i].timestamp}]: ${data['messageList'][i].text}`;
            li.className = 'singleMessage';
            document.querySelector('#messages').append(li);
        }
    });
});
