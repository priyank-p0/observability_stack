"""JSON-based storage service for chat history."""

import json
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

from ..models.storage import ChatRecord, ChatSession
from .tracing_service import tracing_service


class StorageService:
    """Service for storing chat history as JSON files."""
    
    def __init__(self, storage_dir: str = "data"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        
        # Separate files for different data types
        self.chat_records_file = self.storage_dir / "chat_records.json"
        self.sessions_file = self.storage_dir / "sessions.json"
        
        # Ensure files exist
        self._ensure_files_exist()
    
    def _ensure_files_exist(self):
        """Ensure storage files exist."""
        if not self.chat_records_file.exists():
            self._write_json(self.chat_records_file, [])
        
        if not self.sessions_file.exists():
            self._write_json(self.sessions_file, {})
    
    def _read_json(self, file_path: Path) -> Any:
        """Read JSON from file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return [] if file_path == self.chat_records_file else {}
    
    def _write_json(self, file_path: Path, data: Any):
        """Write JSON to file."""
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, default=str, ensure_ascii=False)
    
    def create_session(self, title: Optional[str] = None) -> ChatSession:
        """Create a new chat session."""
        tracer = tracing_service.tracer
        with tracer.start_as_current_span("storage.create_session") as span:
            session_id = str(uuid.uuid4())
            now = datetime.utcnow()
            span.set_attribute("tool.name", "storage.create_session")
            span.set_attribute("session.id", session_id)
            if title:
                span.set_attribute("session.title", title)

            session = ChatSession(
                session_id=session_id,
                title=title or f"Chat {now.strftime('%Y-%m-%d %H:%M')}",
                created_at=now,
                last_activity=now,
                message_count=0
            )
            
            # Load existing sessions
            sessions = self._read_json(self.sessions_file)
            
            # Add new session
            sessions[session.session_id] = session.model_dump()
            
            # Save sessions
            self._write_json(self.sessions_file, sessions)
            
            return session
    
    def get_session(self, session_id: str) -> Optional[ChatSession]:
        """Get a chat session by ID."""
        sessions = self._read_json(self.sessions_file)
        session_data = sessions.get(session_id)
        
        if session_data:
            return ChatSession(**session_data)
        return None
    
    def get_all_sessions(self) -> List[ChatSession]:
        """Get all chat sessions."""
        sessions = self._read_json(self.sessions_file)
        return [ChatSession(**session_data) for session_data in sessions.values()]
    
    def update_session_activity(self, session_id: str):
        """Update session last activity timestamp."""
        sessions = self._read_json(self.sessions_file)
        
        if session_id in sessions:
            sessions[session_id]['last_activity'] = datetime.utcnow().isoformat()
            sessions[session_id]['message_count'] = sessions[session_id].get('message_count', 0) + 1
            self._write_json(self.sessions_file, sessions)
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a chat session and its records."""
        sessions = self._read_json(self.sessions_file)
        
        if session_id in sessions:
            # Remove session
            del sessions[session_id]
            self._write_json(self.sessions_file, sessions)
            
            # Remove chat records for this session
            records = self._read_json(self.chat_records_file)
            records = [
                record for record in records 
                if record.get('session_id') != session_id
            ]
            self._write_json(self.chat_records_file, records)
            
            return True
        return False
    
    def store_chat_record(self, user_text: str, response_text: str, session_id: str) -> ChatRecord:
        """Store a chat record."""
        tracer = tracing_service.tracer
        with tracer.start_as_current_span("storage.store_chat_record") as span:
            span.set_attribute("tool.name", "storage.store_chat_record")
            span.set_attribute("session.id", session_id)
            span.set_attribute("chat.user_text.size", len(user_text) if user_text else 0)
            span.set_attribute("chat.response_text.size", len(response_text) if response_text else 0)

            record_id = str(uuid.uuid4())
            now = datetime.utcnow()
            
            # Create chat record
            record = ChatRecord(
                record_id=record_id,
                session_id=session_id,
                user_text=user_text,
                response_text=response_text,
                timestamp=now
            )
            
            # Load existing records
            records = self._read_json(self.chat_records_file)
            
            # Add new record
            records.append(record.model_dump())
            
            # Save records
            self._write_json(self.chat_records_file, records)
            
            # Update session activity
            self.update_session_activity(session_id)
            
            return record
    
    def get_session_records(self, session_id: str) -> List[ChatRecord]:
        """Get all chat records for a session."""
        records = self._read_json(self.chat_records_file)
        session_records = [
            ChatRecord(**record) for record in records
            if record.get('session_id') == session_id
        ]
        
        # Sort by timestamp
        session_records.sort(key=lambda x: x.timestamp)
        return session_records
    
    def get_all_records(self) -> List[ChatRecord]:
        """Get all chat records."""
        records = self._read_json(self.chat_records_file)
        return [ChatRecord(**record) for record in records]
    
    def search_records(self, query: str, session_id: Optional[str] = None) -> List[ChatRecord]:
        """Search chat records by text content."""
        records = self.get_all_records()
        
        # Filter by session if specified
        if session_id:
            records = [r for r in records if r.session_id == session_id]
        
        # Search in user input and response text
        query_lower = query.lower()
        matching_records = []
        
        for record in records:
            if (query_lower in record.user_text.lower() or 
                query_lower in record.response_text.lower()):
                matching_records.append(record)
        
        return matching_records
    
    def get_stats(self) -> Dict[str, Any]:
        """Get storage statistics."""
        records = self._read_json(self.chat_records_file)
        sessions = self._read_json(self.sessions_file)
        
        return {
            "total_records": len(records),
            "total_sessions": len(sessions),
            "storage_dir": str(self.storage_dir),
            "records_file_size": self.chat_records_file.stat().st_size if self.chat_records_file.exists() else 0,
            "sessions_file_size": self.sessions_file.stat().st_size if self.sessions_file.exists() else 0
        }


# Global storage service instance
storage_service = StorageService()
