#!/usr/bin/env bash
# deploy.sh — Deploy backend + frontend to Cloud Run separately
# Usage: ./deploy.sh <PROJECT_ID> [REGION]
set -euo pipefail

PROJECT="${1:?Usage: ./deploy.sh <PROJECT_ID> [REGION]}"
REGION="${2:-asia-south1}"
REPO="vertex-app"
AR="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}"
SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
SA="vertex-app-sa@${PROJECT}.iam.gserviceaccount.com"

echo "╔══════════════════════════════════════════════════╗"
echo "║   Vertex App — Separate Frontend + Backend       ║"
echo "╚══════════════════════════════════════════════════╝"
echo "Project: $PROJECT | Region: $REGION | SHA: $SHA"
echo ""

# ── Enable APIs ────────────────────────────────────────────────────────────────
echo "▸ [1/7] Enabling GCP APIs…"
gcloud services enable \
  run.googleapis.com \
  aiplatform.googleapis.com \
  artifactregistry.googleapis.com \
  --project="$PROJECT" --quiet

# ── Artifact Registry ──────────────────────────────────────────────────────────
echo "▸ [2/7] Creating Artifact Registry repo…"
gcloud artifacts repositories create "$REPO" \
  --repository-format=docker \
  --location="$REGION" \
  --project="$PROJECT" \
  --quiet 2>/dev/null || true
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# ── Service Account ────────────────────────────────────────────────────────────
echo "▸ [3/7] Setting up service account…"
gcloud iam service-accounts create vertex-app-sa \
  --display-name="Vertex App SA" \
  --project="$PROJECT" --quiet 2>/dev/null || true
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${SA}" \
  --role="roles/aiplatform.user" --quiet

# ── Build + Deploy BACKEND ─────────────────────────────────────────────────────
echo ""
echo "▸ [4/7] Building backend image…"
docker build \
  -t "${AR}/vertex-app-backend:${SHA}" \
  -t "${AR}/vertex-app-backend:latest" \
  ./backend

echo "▸ [5/7] Pushing backend image…"
docker push "${AR}/vertex-app-backend:${SHA}"
docker push "${AR}/vertex-app-backend:latest"

echo "▸ [5/7] Deploying backend to Cloud Run…"
gcloud run deploy vertex-app-backend \
  --image="${AR}/vertex-app-backend:${SHA}" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --cpu=1 --memory=512Mi \
  --min-instances=0 --max-instances=10 \
  --no-cpu-throttling \
  --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=${PROJECT},GCP_LOCATION=${REGION},ALLOWED_ORIGINS=*" \
  --service-account="$SA" \
  --project="$PROJECT" --quiet

BACKEND_URL=$(gcloud run services describe vertex-app-backend \
  --region="$REGION" --project="$PROJECT" --format="value(status.url)")
echo "   ✅ Backend: $BACKEND_URL"

# Update ALLOWED_ORIGINS after frontend deploy (chicken-and-egg workaround: * for now)
# You can lock this down after running the script once:
#   gcloud run services update vertex-app-backend \
#     --update-env-vars ALLOWED_ORIGINS=<FRONTEND_URL>

# ── Build + Deploy FRONTEND ────────────────────────────────────────────────────
echo ""
echo "▸ [6/7] Building frontend image (backend URL: $BACKEND_URL)…"
docker build \
  --build-arg "REACT_APP_BACKEND_URL=${BACKEND_URL}" \
  -t "${AR}/vertex-app-frontend:${SHA}" \
  -t "${AR}/vertex-app-frontend:latest" \
  ./frontend

docker push "${AR}/vertex-app-frontend:${SHA}"
docker push "${AR}/vertex-app-frontend:latest"

echo "▸ [7/7] Deploying frontend to Cloud Run…"
gcloud run deploy vertex-app-frontend \
  --image="${AR}/vertex-app-frontend:${SHA}" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --cpu=1 --memory=256Mi \
  --min-instances=0 --max-instances=20 \
  --project="$PROJECT" --quiet

FRONTEND_URL=$(gcloud run services describe vertex-app-frontend \
  --region="$REGION" --project="$PROJECT" --format="value(status.url)")

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   ✅  Deployment complete!                       ║"
echo "╚══════════════════════════════════════════════════╝"
echo "  🌐 Frontend : $FRONTEND_URL"
echo "  ⚙  Backend  : $BACKEND_URL"
echo ""
echo "💡 To lock down CORS (recommended):"
echo "   gcloud run services update vertex-app-backend \\"
echo "     --update-env-vars ALLOWED_ORIGINS=${FRONTEND_URL} \\"
echo "     --region=${REGION} --project=${PROJECT}"
