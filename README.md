# Deployment

The web app is a Vite frontend and the prediction API is a separate FastAPI service. Vercel serves the frontend; it does not automatically host the FastAPI routes in `main.py`.

For Vercel deployment:

1. Deploy the backend using `render.yaml` (or another Python host) and note its public base URL.
2. In Vercel, set `VITE_API_BASE_URL` to that URL, without a trailing slash (for example, `https://your-backend-service.onrender.com`). Redeploy after setting it.
3. Configure the backend's `FRONTEND_URL` to the Vercel origin and provide its required Supabase environment variables.

The frontend then sends predictions to `${VITE_API_BASE_URL}/api/predict/heart`. Leave `VITE_API_BASE_URL` unset for local development; Vite proxies `/api` to `http://127.0.0.1:8000`.
