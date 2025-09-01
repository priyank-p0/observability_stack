# Observability Stack Chat Interface

A multi-model chat interface supporting OpenAI, Google Gemini, and Anthropic Claude models.

## Features

- **Multi-Model Support**: Chat with OpenAI GPT, Google Gemini, and Anthropic Claude models
- **Conversation Management**: Create, edit, delete, and organize chat conversations
- **Model Configuration**: Customize temperature, max tokens, and system prompts
- **Real-time Chat**: Send messages and receive streaming responses
- **Responsive Design**: Works on desktop and mobile devices
- **Chat History**: Persistent storage of conversations and messages
 - **Tracing & Observability**: OpenTelemetry-based tracing of all LLM calls and spans with an in-app interactive Tracing panel and historical trace browsing

## Setup Instructions

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp env_example.txt .env
   ```
   
   Edit `.env` and add your API keys:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   GOOGLE_API_KEY=your_google_api_key_here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

5. **Run the backend server:**
   ```bash
   python run_server.py
   ```
   
   Or with uvicorn directly:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

### Access the Application

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
 - Tracing API: http://localhost:8000/api/tracing/traces

## API Endpoints

### Chat Endpoints
- `POST /api/chat/send` - Send a chat message
- `GET /api/chat/conversations` - Get all conversations
- `GET /api/chat/conversations/{id}` - Get specific conversation
- `POST /api/chat/conversations` - Create new conversation
- `DELETE /api/chat/conversations/{id}` - Delete conversation
- `PUT /api/chat/conversations/{id}/title` - Update conversation title
- `DELETE /api/chat/conversations/{id}/messages` - Clear conversation
- `GET /api/chat/models` - Get available models

### Storage Endpoints
- `GET /api/chat/sessions` - Get all chat sessions
- `GET /api/chat/sessions/{id}/records` - Get session records
- `GET /api/chat/records` - Get all chat records
- `GET /api/chat/search` - Search chat records
- `GET /api/chat/stats` - Get storage statistics

### Tracing Endpoints
- `GET /api/tracing/traces` - List trace summaries
- `GET /api/tracing/traces/{trace_id}` - Get spans for a trace

## Configuration

### Model Providers

Configure API keys in the `.env` file:
- **OpenAI**: Requires `OPENAI_API_KEY`
- **Google Gemini**: Requires `GOOGLE_API_KEY`  
- **Anthropic Claude**: Requires `ANTHROPIC_API_KEY`

### Available Models

**OpenAI:**
- GPT-4 Turbo
- GPT-4
- GPT-3.5 Turbo

**Google Gemini:**
- Gemini Pro
- Gemini Pro Vision

**Anthropic Claude:**
- Claude 3 Opus
- Claude 3 Sonnet
- Claude 3 Haiku

## Technology Stack

### Backend
- **FastAPI** - Python web framework
- **Pydantic** - Data validation
- **OpenAI API** - GPT models
- **Google Generative AI** - Gemini models
- **Anthropic API** - Claude models
- **OpenTelemetry** - Tracing with FastAPI/HTTPX instrumentation and custom JSON exporter for UI
- **JSON Storage** - File-based persistence for chats and traces

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Axios** - HTTP client
- **Lucide React** - Icons
- **React Hot Toast** - Notifications
- **Vite** - Build tool

## Development

### Project Structure

```
observability_stack/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat.py
│   │   │   └── tracing.py
│   │   ├── models/
│   │   │   ├── chat.py
│   │   │   ├── storage.py
│   │   │   └── tracing.py
│   │   ├── services/
│   │   │   ├── chat_service.py
│   │   │   ├── storage_service.py
│   │   │   ├── openai_adapter.py
│   │   │   ├── google_adapter.py
│   │   │   ├── anthropic_adapter.py
│   │   │   └── tracing_service.py
│   │   ├── config.py
│   │   └── main.py
│   ├── data/
│   ├── requirements.txt
│   └── run_server.py
├── src/
│   ├── components/
│   │   ├── chat/
│   │   ├── layout/
│   │   ├── settings/
│   │   ├── sidebar/
│   │   ├── tracing/
│   │   └── ui/
│   ├── services/
│   ├── store/
│   │   └── traceStore.ts
│   ├── types/
│   │   └── tracing.ts
│   └── App.tsx
├── package.json
└── README.md
```

### Building for Production

1. **Build frontend:**
   ```bash
   npm run build
   ```

2. **Run backend in production:**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

## License

This project is licensed under the MIT License.