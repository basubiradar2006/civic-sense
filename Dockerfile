# ---------- Build React ----------
FROM node:22 AS frontend-build

WORKDIR /frontend

COPY civic_sense_frontend/package*.json ./
RUN npm install

COPY civic_sense_frontend/ ./
RUN npm run build


# ---------- Build Spring Boot ----------
FROM eclipse-temurin:24-jdk AS backend-build

WORKDIR /backend

COPY civic_sense/ ./

RUN chmod +x mvnw
RUN ./mvnw clean package -DskipTests


# ---------- Final application ----------
FROM eclipse-temurin:24-jre

WORKDIR /app

COPY --from=backend-build /backend/target/*.jar app.jar

COPY --from=frontend-build /frontend/dist /app/static

EXPOSE 8085

CMD ["java", "-jar", "app.jar"]