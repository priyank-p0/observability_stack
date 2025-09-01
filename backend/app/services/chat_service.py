"""Chat service for managing conversations and AI model interactions."""

import uuid
from datetime import datetime
from typing import Dict, List, Optional
from ..models.chat import (
    ChatMessage, ChatRequest, ChatResponse, Conversation, 
    ModelProvider, ChatRole, ModelInfo
)
from ..config import settings
from .openai_adapter import OpenAIAdapter
from .google_adapter import GoogleAdapter
from .anthropic_adapter import AnthropicAdapter
from .storage_service import storage_service
from .tracing_service import tracing_service


class ChatService:
    """Service for managing chat conversations and AI model interactions."""
    
    def __init__(self):
        self.conversations: Dict[str, Conversation] = {}
        self.model_adapters = {}
        
        # Initialize adapters only if API keys are provided
        if settings.openai_api_key:
            self.model_adapters[ModelProvider.OPENAI] = OpenAIAdapter(settings.openai_api_key)
        if settings.google_api_key:
            self.model_adapters[ModelProvider.GOOGLE] = GoogleAdapter(settings.google_api_key)
        if settings.anthropic_api_key:
            self.model_adapters[ModelProvider.ANTHROPIC] = AnthropicAdapter(settings.anthropic_api_key)
        
        self.storage = storage_service
    
    def get_available_models(self) -> List[ModelInfo]:
        """Get all available models from all providers."""
        models = []
        for adapter in self.model_adapters.values():
            models.extend(adapter.get_available_models())
        return models
    
    def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """Get conversation by ID."""
        return self.conversations.get(conversation_id)
    
    def get_all_conversations(self) -> List[Conversation]:
        """Get all conversations."""
        return list(self.conversations.values())
    
    def create_conversation(self, title: str = None) -> Conversation:
        """Create a new conversation."""
        # Create storage session
        session = self.storage.create_session(title)
        
        conversation = Conversation(
            id=session.session_id,
            title=session.title,
            messages=[],
            created_at=session.created_at,
            updated_at=session.last_activity
        )
        
        self.conversations[session.session_id] = conversation
        return conversation
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation."""
        # Delete from storage
        success = self.storage.delete_session(conversation_id)
        
        # Delete from memory
        if conversation_id in self.conversations:
            del self.conversations[conversation_id]
        
        return success
    
    async def send_message(self, request: ChatRequest) -> ChatResponse:
        """Send a message and get AI response."""
        try:
            tracer = tracing_service.tracer
            with tracer.start_as_current_span("chat.send_message") as span:
                span.set_attribute("model.provider", request.model_provider.value)
                span.set_attribute("model.name", request.model_name)
                span.set_attribute("chat.temperature", request.temperature)
                if request.max_tokens is not None:
                    span.set_attribute("chat.max_tokens", request.max_tokens)
                if request.system_prompt:
                    span.set_attribute("chat.has_system_prompt", True)

                # Get or create conversation
                if request.conversation_id and request.conversation_id in self.conversations:
                    conversation = self.conversations[request.conversation_id]
                else:
                    conversation = self.create_conversation()
                span.set_attribute("conversation.id", conversation.id)
            
                # Add user message to conversation
                user_message = ChatMessage(
                    role=ChatRole.USER,
                    content=request.message,
                    timestamp=datetime.utcnow()
                )
                conversation.messages.append(user_message)
            
                # Get appropriate model adapter
                adapter = self.model_adapters.get(request.model_provider)
                if not adapter:
                    if request.model_provider not in [ModelProvider.OPENAI, ModelProvider.GOOGLE, ModelProvider.ANTHROPIC]:
                        raise ValueError(f"Unsupported model provider: {request.model_provider}")
                    else:
                        raise ValueError(f"API key not configured for {request.model_provider}. Please add the API key to your .env file.")
            
                # Validate model
                if not adapter.validate_model(request.model_name):
                    raise ValueError(f"Invalid model: {request.model_name}")
            
                # Generate AI response
                with tracer.start_as_current_span("model.chat_completion") as call_span:
                    call_span.set_attribute("model.provider", request.model_provider.value)
                    call_span.set_attribute("model.name", request.model_name)
                    call_span.set_attribute("conversation.id", conversation.id)
                    ai_response = await adapter.chat_completion(
                        messages=conversation.messages,
                        model=request.model_name,
                        temperature=request.temperature,
                        max_tokens=request.max_tokens,
                        system_prompt=request.system_prompt
                    )
            
                # Add AI message to conversation
                ai_message = ChatMessage(
                    role=ChatRole.ASSISTANT,
                    content=ai_response["content"],
                    timestamp=datetime.utcnow(),
                    model_used=ai_response["model"],
                    reasoning=ai_response.get("reasoning")
                )
                conversation.messages.append(ai_message)
            
                # Update conversation timestamp
                conversation.updated_at = datetime.utcnow()
            
                # Store chat record in JSON format
                self.storage.store_chat_record(
                    user_text=request.message,
                    response_text=ai_response["content"],
                    session_id=conversation.id
                )
            
                            # Return response
            return ChatResponse(
                message=ai_response["content"],
                conversation_id=conversation.id,
                model_used=ai_response["model"],
                timestamp=datetime.utcnow(),
                usage=ai_response.get("usage"),
                reasoning=ai_response.get("reasoning")
            )
            
        except Exception as e:
            raise Exception(f"Error in chat service: {str(e)}")
    
    def update_conversation_title(self, conversation_id: str, title: str) -> bool:
        """Update conversation title."""
        if conversation_id in self.conversations:
            self.conversations[conversation_id].title = title
            self.conversations[conversation_id].updated_at = datetime.utcnow()
            return True
        return False
    
    def clear_conversation(self, conversation_id: str) -> bool:
        """Clear all messages from a conversation."""
        if conversation_id in self.conversations:
            self.conversations[conversation_id].messages = []
            self.conversations[conversation_id].updated_at = datetime.utcnow()
            return True
        return False


# Global chat service instance
chat_service = ChatService()
