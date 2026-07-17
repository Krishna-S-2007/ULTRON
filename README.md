# IntelDesk — Autonomous AI Investigation Workspace

**IntelDesk** is an enterprise-grade AI investigation platform that autonomously searches, scrapes, extracts, and synthesizes intelligence from across the web. The system takes a user objective and runs an iterative, multi-stage pipeline to gather verified facts, detect contradictions, resolve knowledge gaps, and generate a comprehensive markdown report.

## 🚀 Features
- **Autonomous Multi-Stage Pipeline**: From mission planning to report generation without user intervention.
- **Real-Time Live Activity Feed**: Streams live actions (searching, validating, reasoning) to the frontend via Server-Sent Events (SSE).
- **Agentic Decision Node**: Dynamically chooses scraping strategies (raw HTML, snippet, or full extraction via Jina Reader) based on domain and content size.
- **Evidence Cross-Verification**: Deduplicates facts, scores source authority, and resolves conflicting claims.
- **Loop Controller**: Detects knowledge gaps and dynamically generates new search queries to iteratively improve confidence.

## 🧠 AI Models Used
This project leverages a multi-model architecture to optimize speed, reasoning, and synthesis:
- **Gemini 3.5 Flash**: Used in the Mission Planner (Stage 1) to rapidly decompose user queries into structured investigation plans and targeted search queries.
- **GLM 5.2**: Utilized in the intelligent extraction and text structuring pipeline, helping to parse complex information from scraped content.
- **Neomotorn Ultra (nemotron-3-super-120b)**: Powers the heavy reasoning tasks in the Evidence Analyzer (Stage 4) and Report Generator (Stage 6), ensuring deep synthesis, contradiction detection, and high-quality final report generation.

## 🏗️ Architecture

### Backend (FastAPI)
The backend is a stateful, asynchronous Python application built with **FastAPI**. It runs a 6-stage autonomous pipeline:
1. **Stage 1 (Mission Planner)**: Uses Gemini 3.5 Flash to decompose the objective and plan the search strategy.
2. **Stage 2 (Source Discovery)**: Uses the Tavily API to run sequential search queries and filter results through a domain blocklist.
3. **Stage 3 (Agentic Decision Node / Validation)**: Intelligently extracts content from discovered URLs using raw content, snippets, or Jina Reader.
4. **Stage 4 (Evidence Analyzer / Conflict Detection)**: Uses Neomotorn Ultra to deduplicate facts, extract claims, identify contradictions, and detect knowledge gaps.
5. **Stage 5 (Loop Controller)**: Evaluates confidence and knowledge gaps, generating new queries for another iteration if needed (Stages 2-4).
6. **Stage 6 (Report Generator)**: Synthesizes all gathered evidence into a final Markdown report using Neomotorn Ultra.

### Frontend (React + Vite)
The frontend is a modern, responsive React application.
- **Stack**: React 19, Vite, TypeScript, TailwindCSS
- **UI Primitives**: shadcn/ui (Radix UI), Framer Motion, Lucide icons
- **Key Components**:
  - `AnimatedRibbon`: A Canvas 2D background reflecting the live state of the investigation.
  - `ExecutionPipeline`: Visualizes the 6-stage pipeline progress.
  - `LiveActivityFeed`: Real-time scrolling feed of agent actions.
  - `ConfidenceRing`: A signature precision measurement ring showing overall investigation confidence.

## 🛠️ Setup & Installation

### Backend Setup
1. Navigate to the `backend` directory.
2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Set up your `.env` file in `backend/Stage_0/` with your API keys (e.g., `TAVILY_API_KEY`).
4. Run the FastAPI server:
   ```bash
   cd Stage_0
   uvicorn main:app --reload
   ```

### Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## 📜 API Contract & SSE Stream
The integration between frontend and backend is handled via REST for initial state loading and Server-Sent Events (SSE) for live updates. 
- **Start Investigation**: `POST /api/investigate`
- **Stream**: `GET /api/investigation/{id}/stream`
- **Report**: `GET /api/report/{id}`

See `frontend/BACKEND_INTEGRATION.md` for a complete reference on data types and the live event stream protocol.
