class Message:
    counter = 0

    def __init__(self, displayName, timestamp, text, sid):
        self.displayName = displayName
        self.timestamp = timestamp
        self.text = text
        self.sid = sid
        self.id = Message.counter
        Message.counter += 1

class Channel:
    def __init__(self, name):
        self.name = name
        self.messages = []
        self.numMessages = 0

    def addMessage(self, message):
        self.messages.append(message)
        self.numMessages += 1
