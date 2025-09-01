"""Main FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os

from .config import settings
from .api.chat import router as chat_router
from .api.tracing import router as tracing_router
from .services.tracing_service import tracing_service

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Observability Stack Chat API",
    description="Chat interface supporting OpenAI, Google Gemini, and Anthropic models",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Initialize tracing after app creation
tracing_service.init_app(app)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat_router)
app.include_router(tracing_router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Observability Stack Chat API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": "2024-01-01T00:00:00Z"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.debug else "An error occurred"
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
