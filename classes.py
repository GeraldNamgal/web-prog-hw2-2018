class Message:
    def __init__(self, displayName, timestamp, text):
        self.displayName = displayName
        self.timestamp = timestamp
        self.text = text

class Channel:
    def __init__(self, name):
        self.name = name
