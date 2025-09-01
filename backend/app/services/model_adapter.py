"""Base model adapter interface."""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from ..models.chat import ChatMessage, ModelInfo


class ModelAdapter(ABC):
    """Abstract base class for AI model adapters."""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.available_models: List[ModelInfo] = []
    
    @abstractmethod
    async def chat_completion(
        self,
        messages: List[ChatMessage],
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate chat completion."""
        pass
    
    def get_available_models(self) -> List[ModelInfo]:
        """Get list of available models."""
        return self.available_models
    
    def validate_model(self, model: str) -> bool:
        """Validate if model is available."""
        return any(m.name == model for m in self.available_models)
