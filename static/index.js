// Global variables
var defaultChannel = "general";

document.addEventListener('DOMContentLoaded', () => {

    // By default, buttons are disabled
    document.querySelectorAll('button').forEach(button => {
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


/****************************************************************************************************/


    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // When connected, configure buttons
    socket.on('connect', () => {

        // When user first opens app give them a default display name if they don't already have one
        if(!localStorage.getItem('displayName'))
            localStorage.setItem('displayName', 'Anonymous');
        // Change display name button accordingly
        if(localStorage.getItem('displayName') == 'Anonymous')
            document.getElementById('displayNameButton').innerHTML = "Create Display Name";
        else
            document.getElementById('displayNameButton').innerHTML = "Change Display Name";

        // TODO: (ERASE LATER; testing synchronize)
        //var testArray = ['clientItem1', 'clientItem2', 'clientItem3']
        //localStorage.setItem('channels', JSON.stringify(testArray));

        // Synchronize the channels between client and server
        socket.emit('submit synchronize channels');

        // When a user submits a channel to create
        document.querySelector('#newChannel').onsubmit = function(event) {
            // Retrieve channel name
            const channelName = document.querySelector('#channelName').value;
            // Alert server of the create channel event
            socket.emit('submit new channel', {'channelName': channelName})
            // Clear input field and disable button again
            document.querySelector('#channelName').value = '';
            document.querySelector('#channelButton').disabled = true;
            // Stop form from submitting
            event.preventDefault();
        };

        // If user is new, take them to default channel
        if(!localStorage.getItem('currentChannel'))
            socket.emit('submit channel change', {'to': defaultChannel});
        // If returning user, take them to channel they were on previously
        else
            socket.emit('submit channel change', {'to': localStorage.getItem('currentChannel')});

        // When a user submits a message
        document.querySelector('#newMessage').onsubmit = function(event) {
            // Retrieve message
            const message = document.querySelector('#message').value;
            // Alert the server of a message-has-been-submitted event
            socket.emit('submit message', {'channelName': localStorage.getItem('currentChannel'), 'displayName': localStorage.getItem('displayName'), 'message': message});
            // Clear input field and disable button again
            document.querySelector('#message').value = '';
            document.querySelector('#messageButton').disabled = true;
            // Stop form from submitting
            event.preventDefault();
        };

        /*
        // TODO: When a user clicks on a channel in the channel list to change channels
        document.querySelector('???').onclick = function(event) {
            // Alert the server of the channel change event
            socket.emit('submit channel change', {'from': localStorage.getItem('currentChannel'), 'to': channelName});
        };

        // TODO: When a user submits a display name
        document.querySelector('#newDisplayName').onsubmit = function(event) {
            // Retrieve display name
            const displayName = document.querySelector('#displayName').value;
            // Change the text on the submit button if this was first display name created
            if((!localStorage.getItem('displayName')) || (localStorage.getItem('displayName') == 'Anonymous'))
                document.getElementById('displayNameButton').innerHTML = "Change Display Name";
            // Add display name to local storage
            localStorage.setItem('displayName', displayName);
            // Clear input field and disable button again
            document.querySelector('#displayName').value = '';
            document.querySelector('#displayNameButton').disabled = true;
            // Stop form from submitting
            event.preventDefault();
            // Alert user that display name was changed
            alert('Display name was updated.');
        };
        */
    });


/****************************************************************************************************/

    // (Code referenced from: https://www.kirupa.com/html5/storing_and_retrieving_an_array_from_local_storage.htm)
    socket.on('announce synchronize channels', data => {
        // Clear channels in list (in case refresh occurs, etc.) to avoid duplicating list on page
        document.querySelector('#channels').innerHTML = '';
        // Retrieve channels that are already in local storage
        var clientChannels = [];
        if (localStorage.getItem('channels')) {
            var retrievedData = localStorage.getItem('channels');
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
                document.querySelector('#channels').append(li);
            }
            // If there are client channels that aren't on server, create them on server
            for (i = 0; i < clientChannels.length; i++) {
                if (!data['serverChannels'].includes(clientChannels[i]))
                    socket.emit('submit new channel', {'channelName': clientChannels[i]})
            }
        }
        // If there are channels on the server
        if (data['serverChannels'].length > 0) {
            // If there are channels on server that aren't on client, add them to client channels and to page
            for (i = 0; i < data['serverChannels'].length; i++) {
                if (!clientChannels.includes(data['serverChannels'][i])) {
                    // Add channel to list of channels on page
                    li = document.createElement('li');
                    li.innerHTML = `${data['serverChannels'][i]}`;
                    document.querySelector('#channels').append(li);
                    // Add channel to client channels list
                    clientChannels.push(data['serverChannels'][i])
                }
            }
        }
        // Set clientChannels list to local storage
        localStorage.setItem('channels', JSON.stringify(clientChannels));
    });

    // When a new channel is made
    socket.on('announce new channel', data => {
        var clientChannels = [];
        if (localStorage.getItem('channels')) {
            var retrievedData = localStorage.getItem('channels');
            clientChannels = JSON.parse(retrievedData);
        }
        // If there were channels in local storage
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
                document.querySelector('#channels').append(li);
            }
        }
    });

    // When a channel change occurs
    socket.on('announce channel change', data => {
        // Change the user's current channel in local storage
        localStorage.setItem('currentChannel', data['channelName']);
        // Change channel title in heading
        document.querySelector('#channelTitle').innerHTML = data['channelName'];
        // Clear messages
        document.querySelector('#messages').innerHTML = '';
        // Repopulate messages with those from new channel
        var li;
        for (i = 0; i < data['messageList'].length; i++) {
            li = document.createElement('li');
            li.innerHTML = `${data['messageList'][i].displayName} [${data['messageList'][i].timestamp}]: ${data['messageList'][i].text}`;
            document.querySelector('#messages').append(li);
        }
    });

    // When a new message is announced
    socket.on('announce message', data => {
        const li = document.createElement('li');
        li.innerHTML = `${data['message'].displayName} [${data['message'].timestamp}]: ${data['message'].text}`;
        document.querySelector('#messages').append(li);
    });
});
