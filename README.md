# AI Software Agency

A full-stack application with FastAPI backend and Next.js frontend.

## Project Structure

- `backend/`: FastAPI microservice
- `frontend/`: Next.js 14 application
- `docker-compose.yml`: Orchestration for services
- `.env`: Global environment variables

## Setup

### Local Development

1. **Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Using Docker

```bash
docker-compose up --build
```

## Usage

- Backend API: http://localhost:8000
- Frontend: http://localhost:3000

## Troubleshooting

- Ensure Python 3.11+ and Node.js 18+ are installed.
- Check .env file for correct environment variables.
- For Docker issues, ensure Docker Desktop is running.