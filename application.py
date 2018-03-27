import os
import sys

from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from classes import Message, Channel
from datetime import datetime
from pytz import timezone

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
socketio = SocketIO(app)

# Global variables
defaultChannel = 'general'
channels = [Channel(defaultChannel)]
messageLimit = 100

@app.route('/')
def index():

    print(f'\n- On load, channels are:', file=sys.stderr)
    for channel in channels:
        print(f'{channel.name}', file=sys.stderr)
    print('\n', file=sys.stderr)

    return render_template('index.html')

@socketio.on('submit get sid')
def getSID():
    sid = request.sid
    emit('announce get sid', {'sid': sid})

@socketio.on('submit synchronize channels')
def syncChannels():
    # Send channels on server to client
    serverChannels = []
    for channel in channels:
        serverChannels.append(channel.name)

    print(f'\n- synchronize channels was called, sending back:', file=sys.stderr)
    for channel in serverChannels:
        print(f'{channel}', file=sys.stderr)
    print('\n', file=sys.stderr)

    emit('announce synchronize channels', {'serverChannels': serverChannels})

@socketio.on('submit new channel')
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
        emit('announce new channel', {'channelName': data['channelName'].strip()}, broadcast=True)

@socketio.on('submit channel change')
def channelChange(data):

    if 'from' in data and data['from'] is not None:
        # Remove user from current channel (if exists) if already on a channel
        for channel in channels:
            if channel.name.lower() == data['from'].strip().lower():
                leave_room(data['from'].strip())
                print(f"\nleft room {data['from'].strip()}", file=sys.stderr)
                print('\n', file=sys.stderr)
                break

    if 'to' in data and data['to'] is not None:
        # Switch user to channel requested (if exists) and get channel's list of messages to send back to client
        for channel in channels:
            if channel.name.lower() == data['to'].strip().lower():
                join_room(data['to'].strip())
                print(f"\njoined room {data['to'].strip()}", file=sys.stderr)
                print('\n', file=sys.stderr)
                messageList = []
                for message in channel.messages:
                    messageList.append(message.__dict__)
                emit('announce channel change', {'channelName': channel.name, 'messageList': messageList})

@socketio.on('submit message')
def message(data):
    # Create a Message object
    message = Message(data['displayName'], datetime.now(timezone('US/Eastern')).strftime('%m-%d-%Y, %I:%M %p').lstrip('0').replace(' 0', ' '), data['message'], data['sid'])
    # Find the channel to append the message to
    for channel in channels:
        if channel.name.lower() == data['channelName'].strip().lower():
            if channel.numMessages > (messageLimit - 1):
                channel.messages.pop(0)
                channel.numMessages -= 1
            channel.addMessage(message)
            # Broadcast message to channel only
            emit('announce message', {'message': message.__dict__}, room=channel.name)

@socketio.on('submit get messages to delete')
def getChannels(data):
    # Return only the user's messages from channel
    for channel in channels:
        if channel.name.lower() == data['channelName'].strip().lower():
            messageList = []
            for message in channel.messages:
                if message.sid == data['sid']:
                    messageList.append(message.__dict__)
            emit('announce get messages to delete', {'messageList': messageList})

@socketio.on('submit delete message')
def deleteMessage(data):
    # Delete the chosen message
    for channel in channels:
        if channel.name.lower() == data['channelName'].strip().lower():
            messageList = []
            newList = []
            for message in channel.messages:
                if (message.id != data['msgID']):
                    newList.append(message)
                    messageList.append(message.__dict__)
            channel.messages = newList
            emit('announce delete message', {'messageList': messageList}, room=channel.name)
