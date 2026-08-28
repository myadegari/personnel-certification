# سامانه گواهی کارمندان — Personnel Certification System

Internal portal for the Larestan Higher Education Complex: employee registration,
course enrollment, admin approval workflow, PDF certificate generation via a
FastAPI microservice, and public certificate verification.

## Stack

- **Next.js 16** (App Router) + React 19
- **MongoDB** (mongoose 9)
- **Alarik** — S3-compatible object storage (replaced MinIO)
- **NextAuth v4** (credentials provider, JWT sessions)
- **FastAPI microservice** for certificate/report generation (WebSocket job status)
- Docker Compose + nginx reverse proxy

## Getting Started

```bash
cp .env.example .env.local   # fill in real values
bun install
bun run dev                  # http://localhost:3000
```

> `bun` is the package manager for this repo (`bun.lock`). Do not use `npm install`.

### Environment variables

See `.env.example`. Highlights:

| Variable | Purpose |
|---|---|
| `MONGODB_URL` | Mongo connection string |
| `NEXTAUTH_URL` / `NEXTAUTH_SECRET` | Public app URL / session secret |
| `STORAGE_ENDPOINT` | Alarik API endpoint (e.g. `http://alarik:8080`) |
| `STORAGE_REGION` | **Must exactly match** Alarik's `ALARIK_REGION`, otherwise requests are rejected |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | S3 credentials (Alarik's `DEFAULT_ACCESS_KEY`/`DEFAULT_SECRET_KEY`) |
| `STORAGE_PUBLIC_URL` | Base URL used to rewrite presigned URLs for browsers |
| `MICROSERVICE_URL` | FastAPI certificate service base URL |

## Deployment

```bash
cp .env.example .env         # docker compose reads this file
docker compose up -d --build
```

Services: `nginx` (:80) → `nextjs` (:3000), `mongodb` (:27017), `alarik` (:8080).
The optional Alarik web console can be enabled in `docker-compose.yml`.

Buckets `profile`, `signature`, `stamp`, `certificate` are auto-seeded by Alarik
(`DEFAULT_BUCKETS`) and are also created on demand by the upload route.

---

## Migrating from MinIO to Alarik

Alarik is S3-compatible, so bucket/object names stay identical and no database
records need rewriting.

### 1. Run Alarik alongside MinIO

Add the `alarik` service from `docker-compose.yml` (keep `minio` temporarily).

### 2. Copy existing objects

```bash
# one-time rclone config for both endpoints, then per bucket:
rclone sync minio:profile  alarik:profile  --progress
rclone sync minio:signature alarik:signature --progress
rclone sync minio:stamp    alarik:stamp    --progress
rclone sync minio:certificate alarik:certificate --progress
```

(Any S3 tool works: `aws s3 sync --endpoint-url ...`.)

### 3. Repoint the app

Set in `.env`:

```
STORAGE_ENDPOINT=http://alarik:8080   # or http://localhost:8080 outside compose
STORAGE_REGION=us-east-1              # must equal ALARIK_REGION
STORAGE_ACCESS_KEY=<alarik key>
STORAGE_SECRET_KEY=<alarik secret>
STORAGE_PUBLIC_URL=<public base URL>
```

Then rebuild/restart the `nextjs` container.

### 4. Verify

- Log in → profile image loads (presigned URL flow)
- Admin course stamps render
- Approve a test enrollment → certificate job starts
- Open `/verify/<certificate-id>` → PDF streams

### 5. Decommission MinIO

Remove the `minio` service from `docker-compose.yml` and drop the `minio_data`
volume once confident.

---

## FastAPI microservice checklist

The certificate generator microservice also writes objects to storage and creates
`File` records with `{ metadata: { job_id, type: "certificate" } }` — the public
verification endpoint `/api/verify/[id]` depends on those records. When moving to
Alarik, update it accordingly:

1. Repoint its S3/minio client to the Alarik endpoint.
2. Match `ALARIK_REGION` exactly and use **path-style** addressing.
3. Keep bucket/object naming identical so existing `File` records remain valid.
4. Confirm new certificates still persist `metadata.job_id` + `metadata.type`.
