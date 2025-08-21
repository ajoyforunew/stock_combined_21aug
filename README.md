# Stock Predictor

This is a full-stack stock price prediction application with:

- Backend: FastAPI + Python + yfinance for fetching stock data.
- Frontend: React + Tailwind CSS with Vite for fast development.
- Dockerized backend and frontend with docker-compose support.
- Kubernetes deployment manifest for easy scaling.

## Setup

1. Backend:
   ```bash
   cd backend/app
   pip install -r requirements.txt
   uvicorn main:app --reload

2. Frontend : 
    cd frontend
npm install
npm run dev
