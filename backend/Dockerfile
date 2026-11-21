FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml ./
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*     && groupadd --gid 10001 prism && useradd --uid 10001 --gid prism --create-home prism
WORKDIR /app
COPY --from=build --chown=prism:prism /build/target/backend-1.0.0.jar /app/backend.jar
USER prism
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/backend.jar"]
