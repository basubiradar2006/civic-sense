# Civic Sense — Run with Docker

One command starts the **database + backend + frontend** on any machine with Docker installed.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) or Docker Engine + Compose plugin (Linux)

> On Windows, enable **WSL 2** backend in Docker Desktop settings.

## Quick start

```bash
docker compose up --build
```

First run downloads the base images and dependencies (a few minutes). When it finishes:

| URL | What |
|-----|------|
| http://localhost:8085 | App (frontend + API) |
| http://localhost:8085/login | Login page |

Register a user, pick a role (`CITIZEN` / `OFFICER` / `CONTRACTOR`), and start filing complaints.

## Useful commands

```bash
docker compose up -d          # start in background
docker compose logs -f app    # follow backend logs
docker compose logs -f db     # follow database logs
docker compose ps             # status of all services
docker compose down           # stop (keeps database data)
docker compose down -v        # stop AND delete database data (fresh start)
docker compose build --no-cache  # full rebuild from scratch
```

## Configuration (optional)

Copy `.env.example` to `.env` and edit as needed:

```bash
cp .env.example .env
```

| Variable | Default | Purpose |
|----------|---------|---------|
| `APP_PORT` | `8085` | Host port for the app |
| `VITE_API_URL` | *(empty)* | API base URL baked into the frontend. Leave empty — the UI is served by the backend, so requests stay same-origin and work from any host |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | `civic_sense` / `civic` / `civic_sense` | Local database credentials |
| `SPRING_DATASOURCE_URL` / `_USERNAME` / `_PASSWORD` | local `db` container | Point the backend at an external database instead |

The `SPRING_DATASOURCE_*` environment variables override the datasource values hardcoded in
`civic_sense/src/main/resources/application.properties`, because OS environment variables take
precedence over that file — **no code changes required**.

## How it works

```
docker-compose.yml
├── db        postgres:15-alpine         (data persisted in the `db-data` volume)
└── app       multi-stage Dockerfile
              ├── stage 1: node:22-slim   → npm ci + vite build (frontend)
              ├── stage 2: temurin 17-jdk → mvnw package (backend),
              │                            frontend dist baked into jar at /static
              └── stage 3: temurin 17-jre → runs app.jar on port 8085
```

The React build output is copied into `src/main/resources/static/` **inside the image only**
(never into your working tree), so Spring Boot serves both the SPA and the REST API from a
single port — which is also why `VITE_API_URL` can stay empty.

## Using your own database

**Option A — external database only** (skip the local `db` container):

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://your-host:5432/your-db
SPRING_DATASOURCE_USERNAME=your-user
SPRING_DATASOURCE_PASSWORD=your-password
```

**Option B — keep the local container** but change credentials: edit `POSTGRES_*` in `.env`.

Note: with `spring.jpa.hibernate.ddl-auto=update`, Hibernate creates/updates the tables
automatically on first start — no manual migration step.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `port is already allocated` | Another service uses 8085 → set `APP_PORT=8086` in `.env` |
| App exits: `connection refused` to db | Wait for the `db` healthcheck, or `docker compose up` again |
| Frontend shows old version after pulling changes | `docker compose build --no-cache && docker compose up -d` |
| Database state is wrong | `docker compose down -v` then `docker compose up` (fresh DB) |
| Windows line-ending errors on `mvnw` | Handled automatically — the Dockerfile runs `sed -i 's/\r$//' mvnw` |
