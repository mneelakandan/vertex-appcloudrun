# Vertex App — Separate Frontend + Backend on Cloud Run

```
┌──────────────────────────┐      ┌────────────────────────────┐      ┌──────────────────────┐
│  React + nginx           │ HTTP │  Express + Vertex AI SDK   │ gRPC │  Vertex AI (Gemini)  │
│  Cloud Run: frontend     │─────▶│  Cloud Run: backend        │─────▶│  GCP-internal auth   │
│  Port 8080               │      │  Port 8080                 │      │                      │
└──────────────────────────┘      └────────────────────────────┘      └──────────────────────┘
         (nginx)                         (node:20)
```

Both services are **independently deployed**, scaled, and versioned.

---

## Project Structure

```
vertex-app/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express app entry
│   │   ├── routes/
│   │   │   ├── chat.js           # POST /api/chat, GET /api/chat/models
│   │   │   └── health.js         # GET /health
│   │   └── services/
│   │       └── vertex.js         # Vertex AI SDK wrapper
│   ├── package.json
│   ├── Dockerfile                # node:20-alpine
│   ├── cloudbuild.yaml           # Backend CI/CD
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── App.js                # Root component
│   │   ├── App.css
│   │   ├── index.js
│   │   ├── components/
│   │   │   ├── Message.jsx       # Chat message + typewriter
│   │   │   ├── ChatInput.jsx     # Textarea + send button
│   │   │   └── ModelPicker.jsx   # Gemini model switcher
│   │   ├── hooks/
│   │   │   └── useChat.js        # Chat state + API integration
│   │   └── services/
│   │       └── api.js            # Fetch calls to backend
│   ├── public/index.html
│   ├── nginx.conf                # SPA routing + health endpoint
│   ├── package.json
│   ├── Dockerfile                # Multi-stage: node build → nginx serve
│   ├── cloudbuild.yaml           # Frontend CI/CD (reads backend URL dynamically)
│   └── .env.example
│
├── terraform/
│   └── main.tf                   # Full IaC: APIs, AR, SA, IAM, both Cloud Runs
│
└── deploy.sh                     # One-shot script: backend → frontend
```

---

## Local Development

### Backend

```bash
cd backend
cp .env.example .env
# Set GCP_PROJECT_ID in .env
npm install
gcloud auth application-default login
node src/index.js      # http://localhost:8080
```

Test:
```bash
curl http://localhost:8080/health
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello!","model":"gemini-1.5-flash"}'
```

### Frontend

```bash
cd frontend
cp .env.example .env
# REACT_APP_BACKEND_URL=http://localhost:8080
npm install
npm start              # http://localhost:3000
```

---

## Deploy to Cloud Run

### Option A — One-shot script (easiest)

```bash
chmod +x deploy.sh
./deploy.sh YOUR_PROJECT_ID asia-south1
```

Deploys backend first, captures its URL, then builds the frontend with that URL **baked into the React bundle** (as `REACT_APP_BACKEND_URL`), and deploys frontend.

### Option B — Terraform

```bash
cd terraform

cat > terraform.tfvars <<EOF
project_id = "YOUR_PROJECT_ID"
region     = "asia-south1"
EOF

terraform init && terraform apply
```

> Note: Terraform provisions infrastructure. Use `deploy.sh` or Cloud Build to push the actual Docker images.

### Option C — Cloud Build (push-to-deploy)

1. Deploy backend trigger: points to `backend/` directory, uses `backend/cloudbuild.yaml`
2. Deploy frontend trigger: points to `frontend/` directory, uses `frontend/cloudbuild.yaml`
   - The frontend pipeline automatically reads the backend URL from Cloud Run before building

---

## Environment Variables

### Backend

| Variable          | Required | Default       | Description                          |
|-------------------|----------|---------------|--------------------------------------|
| `GCP_PROJECT_ID`  | ✅       | —             | Your GCP project ID                  |
| `GCP_LOCATION`    | ❌       | `us-central1` | Vertex AI region                     |
| `ALLOWED_ORIGINS` | ❌       | `*`           | CORS origins (set to frontend URL)   |
| `PORT`            | ❌       | `8080`        | Listen port                          |

### Frontend

| Variable                  | When        | Description                        |
|---------------------------|-------------|------------------------------------|
| `REACT_APP_BACKEND_URL`   | Build time  | Backend Cloud Run URL              |

> `REACT_APP_*` variables are **baked into the bundle at build time** by Create React App. They are not runtime env vars.

---

## Key Architecture Decisions

| Decision | Reasoning |
|----------|-----------|
| Separate Cloud Run services | Independent scaling — frontend (nginx) and backend (Node) have different resource profiles |
| nginx for frontend | Serves static files efficiently with proper caching headers and SPA routing |
| Backend URL baked at build time | CRA doesn't support runtime env vars without a custom server; build arg injection is the standard pattern |
| `--no-cpu-throttling` on backend | Prevents latency spikes on Vertex AI streaming requests |
| `ALLOWED_ORIGINS` env var | Lock down CORS after first deploy: set to frontend URL |
| Service Account per backend | Principle of least privilege — only backend needs `roles/aiplatform.user` |

---

## After Deploy — Lock Down CORS

```bash
gcloud run services update vertex-app-backend \
  --update-env-vars ALLOWED_ORIGINS=https://YOUR_FRONTEND_URL.run.app \
  --region=asia-south1 \
  --project=YOUR_PROJECT_ID
```
