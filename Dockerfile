
# syntax=docker/dockerfile:1

# ============================================================
# Stage 1 — Build the React frontend
# ============================================================
FROM node:22-slim AS frontend-build

WORKDIR /frontend

COPY civic_sense_frontend/package.json civic_sense_frontend/package-lock.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY civic_sense_frontend/ ./

ARG VITE_API_URL=""

RUN if [ -f .env ]; then \
        sed -i "s|^VITE_API_URL=.*|VITE_API_URL=${VITE_API_URL}|" .env; \
    fi \
    && npm run build


# ============================================================
# Stage 2 — Build the Spring Boot backend
# ============================================================
FROM eclipse-temurin:17-jdk AS backend-build

WORKDIR /backend

# Updated folder name
COPY civic_sense_backend/ ./

RUN sed -i 's/\r$//' mvnw && chmod +x mvnw

COPY --from=frontend-build /frontend/dist/ src/main/resources/static/

RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw -B clean package -DskipTests


# ============================================================
# Stage 3 — Runtime image
# ============================================================
FROM eclipse-temurin:17-jre

WORKDIR /app

COPY --from=backend-build /backend/target/*.jar app.jar

EXPOSE 8085

ENV JAVA_OPTS=""

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
