import os

from flask import Flask, render_template
from flask_socketio import SocketIO, emit, join_room, leave_room
from classes import Message, Channel
from datetime import datetime
from pytz import timezone

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# Global variables
defaultChannel = "general"
channels = [Channel(defaultChannel)]

@app.route("/")
def index():
    return render_template("index.html")

@socketio.on("submit synchronize channels")
def syncChannels():
    # Send channels on server to client
    serverChannels = []
    for channel in channels:
        serverChannels.append(channel.name)
    emit("announce synchronize channels", {'serverChannels': serverChannels})

@socketio.on("submit new channel")
def newChannel(data):
    # If channel is new to server, add it
    found = False
    for channel in channels:
        if channel.name.lower() == data['channelName'].strip().lower():
            found = True
            break
    if not found:
        # Append new channel object to list of channels
        channels.append(Channel(data['channelName'].strip()))
        emit("announce new channel", {'channelName': data['channelName'].strip()}, broadcast=True)

@socketio.on("submit channel change")
def channelChange(data):
    # Remove user from current channel if already on a channel
    if 'from' in data:
        leave_room(data['from'].strip())
    # Switch user to channel requested
    join_room(data['to'].strip())
    # Get channel's list of messages and send back to client
    for channel in channels:
        if channel.name.lower() == data['to'].strip().lower():
            messageList = []
            for message in channel.messages:
                messageList.append(message.__dict__)
            emit("announce channel change", {'channelName': channel.name, 'messageList': messageList})

@socketio.on("submit message")
def message(data):
    # Create a Message object
    message = Message(data['displayName'], datetime.now(timezone("US/Eastern")).strftime("%m-%d-%Y, %I:%M %p").lstrip("0").replace(" 0", " "), data["message"])
    # Find the channel to append the message to
    for channel in channels:
        if channel.name.lower() == data['channelName'].strip().lower():
            channel.messages.append(message)
            # Broadcast message to channel only
            emit("announce message", {'message': message.__dict__}, room=channel.name)
