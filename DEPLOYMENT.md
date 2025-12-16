# Deployment to Vercel (Frontend)

This project contains a Vite React frontend and a Python backend (Flask/Wav2Lip). Vercel is a great host for the frontend static site. The backend requires a separate host (Render/Fly.io/Heroku) because it relies on long-running processes, heavy models, and filesystem access.

Frontend steps (Vercel):

- In the Vercel dashboard, create a new project and connect this repository.
- Set the root to the project root (default).
- Build command: `npm run build`
- Output directory: `dist`
- Add an Environment Variable named `VITE_AUTH_API_URL` with the full URL to your deployed backend API (for example `https://api.example.com/api`).

Notes for backend:

- The backend in `backend/` depends on heavy ML models (Wav2Lip). Deploy it to a VM-like host (e.g., Render Private Service, Fly.io, or a VPS) that supports GPU or sufficient CPU and persistent storage.
- After deploying the backend, set `VITE_AUTH_API_URL` in Vercel to point to your backend's base API URL.

Local verification:

1. Install dependencies: `npm install`
2. Build locally: `npm run build`
3. Serve locally (optional): `npx serve dist` or `npm run preview`

Security:

- Do not commit secrets. Use Vercel Environment Variables for API keys and secrets.
