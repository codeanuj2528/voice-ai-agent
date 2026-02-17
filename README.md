# Voice AI Agent 🎙️

A real-time Voice AI Agent built with **LiveKit**, **FastAPI**, and **React**. It features advanced RAG (Retrieval-Augmented Generation) capabilities, supporting document uploads for context-aware conversations.

## 🏗️ Architecture

The project follows a modular **Clean Architecture** to ensure separation of concerns and scalability.

```text
+----------------+      WebRTC       +----------------+      Protocol      +--------------------+
| Client (React) | <---------------> | LiveKit Cloud  | <----------------> | Voice Agent Worker |
+----------------+                   +----------------+                    +--------------------+
        |                                                                           |
        | HTTP                                                                      | Function Calls
        v                                                                           v
+----------------+                                                         +--------------------+
|  Backend API   | <-------------- (RAG Context) ------------------------- |      AI Models     |
+----------------+                                                         +--------------------+
        |                                                                    (Groq, Deepgram)
        v
+----------------+
|   Vector DB    |
+----------------+
```

### Components

1.  **Frontend (`client/`)**:
    -   Built with **React**, **Vite**, and **TailwindCSS**.
    -   Uses `@livekit/components-react` for WebRTC connection and state management.
    -   Handles real-time audio visualization and transcript display.
    -   Communicates with Backend API for token generation and document uploads.

2.  **Backend API (`server/main.py`)**:
    -   Built with **FastAPI**.
    -   **Auth**: Generates LiveKit Access Tokens.
    -   **RAG**: Processes uploaded documents, generates embeddings (Jina AI), and stores them in vector storage for retrieval.

3.  **Voice Agent Worker (`server/agent/voice_agent.py`)**:
    -   Runs as a **LiveKit Worker**.
    -   Participates in the room solely to handle audio/intelligence.
    -   **STT**: Groq `whisper-large-v3-turbo` (Fast transcription).
    -   **LLM**: Groq `llama-3.1-8b-instant` (Intelligence & Tool Calling).
    -   **TTS**: Deepgram `aura` (Low latency speech synthesis).
    -   **VAD**: Silero VAD (Voice Activity Detection).

## 🚀 Prerequisites

-   **Node.js** (v18+)
-   **Python** (v3.11+)
-   **LiveKit Cloud Account** (or local LiveKit server)
-   **API Keys**:
    -   [Groq](https://console.groq.com)
    -   [Deepgram](https://console.deepgram.com)
    -   [Jina AI](https://jina.ai)
    -   [Firebase/Firestore](https://firebase.google.com) 

## 🛠️ Setup

### 1. Clone & Configure

```bash
git clone https://github.com/codeanuj2528/voice-ai-agent.git
cd voice-ai-agent
```

 Create the `.env` file for the server:

```bash
cp server/.env.example server/.env
```

Update `server/.env` with your credentials:

```ini
GROQ_API_KEY=your_groq_key
DEEPGRAM_API_KEY=your_deepgram_key
JINA_API_KEY=your_jina_key
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

### 2. Install Dependencies

**Server (Python):**
```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Client (Node.js):**
```bash
cd client
npm install
```

## ▶️ Running the App

### Option 1: One-Click Script (Recommended for Local Dev)
We provide a helper script to start the Backend API, Voice Worker, and Frontend simultaneously.

```bash
# Provide execute permission (first time only)
chmod +x run_app.sh

# Run the app
./run_app.sh
```
-   Frontend: `http://localhost:3000`
-   Backend API: `http://localhost:8000`

### Option 2: Manual Startup

Run each service in a separate terminal window.

**1. Backend API:**
```bash
cd server
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**2. Voice Worker:**
```bash
cd server
source venv/bin/activate
# 'dev' mode enables auto-reload and auto-connect
python agent/voice_agent.py dev
```

**3. Frontend:**
```bash
cd client
npm run dev
```

## 🐳 Docker Support

The project includes Docker configuration for deployment.

```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 📚 Features

-   **Real-time Voice Conversation**: Ultra-low latency voice interaction.
-   **RAG (Retrieval Augmented Generation)**: Upload PDF/Docs and ask the agent questions about them.
-   **Live Transcripts**: See what the agent hears and says in real-time.
-   **Visualizations**: Dynamic audio visualizers for user and agent.
