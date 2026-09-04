# سامانه گواهی کارمندان — Personnel Certification System

Internal portal for the Larestan Higher Education Complex: admin-provisioned employee
accounts, course enrollment, admin approval workflow, PDF certificate generation via a
FastAPI microservice, and public certificate verification.

Public signup is disabled. Superadmins create and manage admin accounts; admins
create regular user accounts and set user fields such as role, deputy, and
signature. Regular users can log in, view/enroll in courses,
download certificates, and change their own password.

## Stack

- **Next.js 16** (App Router) + React 19
- **MongoDB** (mongoose 9)
- **Alarik** — S3-compatible object storage
- **NextAuth v4** (credentials provider, JWT sessions)
- **FastAPI microservice** for certificate generation (HMAC webhook + SSE job status)
- Docker Compose orchestration from the parent `certificate-system` workspace

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
| `WEBHOOK_SECRET` | HMAC-SHA256 secret shared with the worker to sign certificate status callbacks |
| `SUPERADMIN_*` | Optional seed values used by `bun run seed:superadmin` |

## Deployment

This app is orchestrated from the parent `certificate-system` workspace. Run
Docker Compose from the workspace root, not from this folder:

```bash
cd ..
cp .env.example .env                 # root infra credentials
docker compose up -d --build nextjs
```

Services started by the root compose file include `nextjs` (:3000), `mongodb`
(:27017), `alarik` (:8080), `fastapi` (:8000), `worker`, `rabbitmq`, and
`redis`.

Buckets `signature`, `stamp`, `certificate`, and `media` are auto-seeded by
Alarik (`DEFAULT_BUCKETS`) and are also created on demand by the upload routes.

## Superadmin bootstrap

Create the first `SUPERADMIN` account with a seed script. Set the
`SUPERADMIN_*` variables in `.env.local` or `.env`, then run:

```bash
bun run seed:superadmin
```

Inside Docker:

```bash
docker compose exec nextjs bun run seed:superadmin
```

The script upserts the user by `SUPERADMIN_PERSONNEL_NUMBER`, hashes the
password, and sets the account to `role: "SUPERADMIN"` and `status: "VERIFIED"`.

## Profile image cleanup

Profile images are no longer part of the app. If an older database still has
`profileImage` fields or `File` records in the `profile` bucket, preview the
cleanup first:

```bash
bun scripts/cleanup-profile-images.js --dry-run
```

Then run it for real:

```bash
bun run cleanup:profile-images
```

---

## FastAPI microservice checklist

The certificate generator microservice also writes objects to storage and creates
`File` records with `{ bucket: "certificate", metadata: { job_id, type } }` — the
public verification endpoint `/api/verify/[id]` resolves a certificate by
`metadata.job_id` + `bucket: "certificate"` (the `type` field is informational, so
legacy records without it still resolve). Keep these contracts when changing
storage or certificate generation:

1. Point both services at the same Alarik endpoint.
2. Match `ALARIK_REGION` exactly and use **path-style** addressing.
3. Keep bucket/object naming identical so existing `File` records remain valid.
4. Confirm new certificates still persist `metadata.job_id` and use the
   `certificate` bucket.
