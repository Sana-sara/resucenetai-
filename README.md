# RescueNet AI+

RescueNet AI+ is a full-stack starter project with:
- **Frontend:** React + Vite
- **Backend:** Flask

## Structure

```text
frontend/
backend/
```

## Run both frontend + backend together (single command)

From the project root:

```bash
npm install
npm start
```

This uses `concurrently` to start:
- Flask backend from `backend` using `python app.py`
- React frontend from `frontend` using `npm run dev`

## Manual quick start (optional)
## Quick start

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```
