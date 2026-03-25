# Conversation Storage System for Drew Command Center
# This will store ALL conversations persistently

import json
import os
from datetime import datetime

class ConversationStore:
    def __init__(self, storage_path="conversations.json"):
        self.storage_path = storage_path
        self.conversations = self.load_conversations()
    
    def load_conversations(self):
        """Load all previous conversations"""
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, 'r') as f:
                    return json.load(f)
            except:
                return []
        return []
    
    def save_conversations(self):
        """Persist conversations to disk"""
        with open(self.storage_path, 'w') as f:
            json.dump(self.conversations, f, indent=2)
    
    def add_message(self, role, content, metadata=None):
        """Add a new message to persistent storage"""
        message = {
            'id': len(self.conversations) + 1,
            'role': role,  # 'user' or 'assistant'
            'content': content,
            'timestamp': datetime.utcnow().isoformat(),
            'session_date': datetime.now().strftime('%Y-%m-%d'),
            'metadata': metadata or {}
        }
        self.conversations.append(message)
        self.save_conversations()
        return message
    
    def get_all_conversations(self):
        """Get all conversations ever"""
        return self.conversations
    
    def get_recent(self, limit=50):
        """Get recent conversations"""
        return self.conversations[-limit:]
    
    def get_by_date(self, date):
        """Get conversations from specific date"""
        return [msg for msg in self.conversations if msg['session_date'] == date]
    
    def import_session_summary(self, summary_text):
        """Import conversation summary from previous sessions"""
        summary_message = {
            'id': len(self.conversations) + 1,
            'role': 'system',
            'content': f"📋 Session Summary: {summary_text}",
            'timestamp': datetime.utcnow().isoformat(),
            'session_date': datetime.now().strftime('%Y-%m-%d'),
            'metadata': {'type': 'session_summary'}
        }
        self.conversations.append(summary_message)
        self.save_conversations()
        return summary_message