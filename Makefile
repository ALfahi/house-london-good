.PHONY: backend frontend dev test build

backend:
	cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

test:
	cd backend && .venv/bin/pytest
	cd frontend && npm run typecheck

build:
	cd frontend && npm run build
