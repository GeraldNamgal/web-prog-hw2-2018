import os

from flask import Flask, render_template, session
from flask_socketio import SocketIO, emit
from flask_session import Session
from classes import Message
from datetime import datetime
from pytz import timezone

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# Configure session to use filesystem
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

# Global variables
messages = []

@app.route("/")
def index():
    # Retrieve a display name
    if session.get("displayName") is None:
        session["displayName"] = "Anonymous"
    # Return main page
    return render_template("index.html", name=session["displayName"], messages=messages)

@socketio.on("submit message")
def message(data):

    # TODO: append message to local storage (for debugging?)

    # Retrieve a display name
    if session.get("displayName") is None:
        session["displayName"] = "Anonymous"

    # Create a Message object
    message = Message(session["displayName"], datetime.now(timezone("US/Eastern")).strftime("%m-%d-%Y, %I:%M %p").lstrip("0").replace(" 0", " "), data["message"])

    # Append the message to the running global messages list
    messages.append(message)

    # Broadcast to all that a new message has been made
    emit("announce message", message.__dict__, broadcast=True)

@socketio.on("submit display name")
def displayName(data):
    # Change the session display name
    session["displayName"] = data["displayName"]
    # Tell user that a new display name has been made
    emit("announce display name")
