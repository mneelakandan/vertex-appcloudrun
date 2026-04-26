################################################################################
# terraform/main.tf
# Provisions: Artifact Registry, IAM SA, backend Cloud Run, frontend Cloud Run
# Deploy order: backend first → get its URL → frontend
################################################################################

terraform {
  required_version = ">= 1.6"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ── Variables ──────────────────────────────────────────────────────────────────
variable "project_id"       { type = string }
variable "region"           { type = string; default = "asia-south1" }
variable "backend_service"  { type = string; default = "vertex-app-backend" }
variable "frontend_service" { type = string; default = "vertex-app-frontend" }
variable "repo_name"        { type = string; default = "vertex-app" }

# Image tags — set these after Cloud Build runs
variable "backend_image_tag"  { type = string; default = "latest" }
variable "frontend_image_tag" { type = string; default = "latest" }

locals {
  ar_base        = "${var.region}-docker.pkg.dev/${var.project_id}/${var.repo_name}"
  backend_image  = "${local.ar_base}/${var.backend_service}:${var.backend_image_tag}"
  frontend_image = "${local.ar_base}/${var.frontend_service}:${var.frontend_image_tag}"
}

# ── Enable APIs ────────────────────────────────────────────────────────────────
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "aiplatform.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
  ])
  service            = each.value
  disable_on_destroy = false
}

# ── Artifact Registry ──────────────────────────────────────────────────────────
resource "google_artifact_registry_repository" "repo" {
  repository_id = var.repo_name
  location      = var.region
  format        = "DOCKER"
  depends_on    = [google_project_service.apis]
}

# ── Service Account (backend only needs Vertex AI) ─────────────────────────────
resource "google_service_account" "backend_sa" {
  account_id   = "vertex-app-sa"
  display_name = "Vertex App Backend SA"
}

resource "google_project_iam_member" "vertex_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}

# ── Backend Cloud Run ──────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "backend" {
  name     = var.backend_service
  location = var.region

  template {
    service_account = google_service_account.backend_sa.email

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = local.backend_image

      ports { container_port = 8080 }

      resources {
        limits = { cpu = "1", memory = "512Mi" }
        cpu_idle          = false   # no-cpu-throttling
        startup_cpu_boost = true
      }

      env { name = "NODE_ENV";       value = "production" }
      env { name = "GCP_PROJECT_ID"; value = var.project_id }
      env { name = "GCP_LOCATION";   value = var.region }
      # ALLOWED_ORIGINS — set after frontend is deployed (or use * initially)
      env { name = "ALLOWED_ORIGINS"; value = "*" }
    }
  }

  depends_on = [google_artifact_registry_repository.repo]
}

# Public backend
resource "google_cloud_run_v2_service_iam_member" "backend_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ── Frontend Cloud Run ─────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "frontend" {
  name     = var.frontend_service
  location = var.region

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 20
    }

    containers {
      image = local.frontend_image   # nginx serving static React build

      ports { container_port = 8080 }

      resources {
        limits = { cpu = "1", memory = "256Mi" }
        cpu_idle = true   # OK to throttle static file server
      }
    }
  }

  depends_on = [google_cloud_run_v2_service.backend]
}

# Public frontend
resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ── Outputs ────────────────────────────────────────────────────────────────────
output "backend_url" {
  description = "Backend Cloud Run URL"
  value       = google_cloud_run_v2_service.backend.uri
}

output "frontend_url" {
  description = "Frontend Cloud Run URL (your app)"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "artifact_registry" {
  value = local.ar_base
}
