# Software Architecture & Knowledge Document: UtkarshMudgal2802droid/payshield

> *Generated Autonomously by PRISM Agentic Extraction*

## 1. Executive Summary & Problem Statement
PayShield is a full-stack, enterprise-grade financial transactions and wallet platform designed to secure digital payments against sophisticated web fraud and concurrency races. In modern fintech applications, systems face high-frequency concurrent balance transfers and fraudulent transactions that can lead to race conditions, double-spending vulnerabilities, and massive financial loss. PayShield solves this by combining a robust Spring Boot backend featuring optimistic locking and Redis-backed rate limiting, alongside a dedicated Python FastAPI risk-engine microservice leveraging Celery asynchronous task workers for real-time fraud scoring and model retraining.

## 2. Technology Stack
- Java 21
- Spring Boot 4.1.1
- Spring Security
- Spring Data JPA
- Spring Data Redis
- Flyway
- PostgreSQL
- Python
- FastAPI
- Celery
- Docker
- Docker Compose
- React
- Vite

## 3. Repository Structure
```text
[DIR]  .github
[DIR]  .github/workflows
[FILE] .github/workflows/ci.yml
[FILE] .gitignore
[FILE] README.md
[DIR]  backend
[FILE] backend/.dockerignore
[FILE] backend/.gitattributes
[FILE] backend/.gitignore
[DIR]  backend/.mvn
[DIR]  backend/.mvn/wrapper
[FILE] backend/.mvn/wrapper/maven-wrapper.properties
[FILE] backend/Dockerfile
[FILE] backend/concurrency_test.py
[FILE] backend/mvnw
[FILE] backend/mvnw.cmd
[FILE] backend/pom.xml
[DIR]  backend/src
[DIR]  backend/src/main
[DIR]  backend/src/main/java
[DIR]  backend/src/main/java/com
[DIR]  backend/src/main/java/com/payshield
[DIR]  backend/src/main/java/com/payshield/backend
[FILE] backend/src/main/java/com/payshield/backend/BackendApplication.java
[DIR]  backend/src/main/java/com/payshield/backend/config
[FILE] backend/src/main/java/com/payshield/backend/config/ApplicationConfig.java
[FILE] backend/src/main/java/com/payshield/backend/config/DataSeeder.java
[FILE] backend/src/main/java/com/payshield/backend/config/SecurityConfiguration.java
[DIR]  backend/src/main/java/com/payshield/backend/controller
[FILE] backend/src/main/java/com/payshield/backend/controller/AuthenticationController.java
[FILE] backend/src/main/java/com/payshield/backend/controller/FraudController.java
[FILE] backend/src/main/java/com/payshield/backend/controller/GlobalExceptionHandler.java
[FILE] backend/src/main/java/com/payshield/backend/controller/MerchantController.java
[FILE] backend/src/main/java/com/payshield/backend/controller/PaymentController.java
[FILE] backend/src/main/java/com/payshield/backend/controller/ReconciliationController.java
[FILE] backend/src/main/java/com/payshield/backend/controller/RefundController.java
[FILE] backend/src/main/java/com/payshield/backend/controller/ReportController.java
[FILE] backend/src/main/java/com/payshield/backend/controller/SettlementController.java
[FILE] backend/src/main/java/com/payshield/backend/controller/WalletController.java
[DIR]  backend/src/main/java/com/payshield/backend/dto
[FILE] backend/src/main/java/com/payshield/backend/dto/AuthenticationRequest.java
[FILE] backend/src/main/java/com/payshield/backend/dto/AuthenticationResponse.java
[FILE] backend/src/main/java/com/payshield/backend/dto/DashboardMetricsResponse.java
[FILE] backend/src/main/java/com/payshield/backend/dto/FraudAssessmentRequest.java
[FILE] backend/src/main/java/com/payshield/backend/dto/FraudAssessmentResponse.java
[FILE] backend/src/main/java/com/payshield/backend/dto/MerchantRequest.java
[FILE] backend/src/main/java/com/payshield/backend/dto/MerchantResponse.java
[FILE] backend/src/main/java/com/payshield/backend/dto/PaymentRequest.java
[FILE] backend/src/main/java/com/payshield/backend/dto/PaymentResponse.java
[FILE] backend/src/main/java/com/payshield/backend/dto/ReconciliationJobResponse.java
[FILE] backend/src/main/java/com/payshield/backend/dto/RefundRequest.java
[FILE] backend/src/main/java/com/payshield/backend/dto/RefundResponse.java
[FILE] backend/src/main/java/com/payshield/backend/dto/RegisterRequest.java
[DIR]  backend/src/main/java/com/payshield/backend/exception
[FILE] backend/src/main/java/com/payshield/backend/exception/ApiError.java
[FILE] backend/src/main/java/com/payshield/backend/exception/FraudDetectedException.java
[FILE] backend/src/main/java/com/payshield/backend/exception/InsufficientBalanceException.java
[DIR]  backend/src/main/java/com/payshield/backend/model
[FILE] backend/src/main/java/com/payshield/backend/model/AuditEvent.java
[FILE] backend/src/main/java/com/payshield/backend/model/FraudAssessment.java
[FILE] backend/src/main/java/com/payshield/backend/model/FraudDecision.java
[FILE] backend/src/main/java/com/payshield/backend/model/FraudRule.java
[FILE] backend/src/main/java/com/payshield/backend/model/IdempotencyRecord.java
[FILE] backend/src/main/java/com/payshield/backend/model/Merchant.java
[FILE] backend/src/main/java/com/payshield/backend/model/MerchantStatus.java
[FILE] backend/src/main/java/com/payshield/backend/model/MismatchType.java
[FILE] backend/src/main/java/com/payshield/backend/model/Payment.java
[FILE] backend/src/main/java/com/payshield/backend/model/PaymentStatus.java
[FILE] backend/src/main/java/com/payshield/backend/model/ReconciliationJob.java
[FILE] backend/src/main/java/com/payshield/backend/model/ReconciliationMismatch.java
[FILE] backend/src/main/java/com/payshield/backend/model/Refund.java
[FILE] backend/src/main/java/com/payshield/backend/model/RefundStatus.java
[FILE] backend/src/main/java/com/payshield/backend/model/Role.java
[FILE] backend/src/main/java/com/payshield/backend/model/Settlement.java
[FILE] backend/src/main/java/com/payshield/backend/model/SettlementStatus.java
[FILE] backend/src/main/java/com/payshield/backend/model/Transaction.java
[FILE] backend/src/main/java/com/payshield/backend/model/User.java
[FILE] backend/src/main/java/com/payshield/backend/model/Wallet.java
[DIR]  backend/src/main/java/com/payshield/backend/repository
[FILE] backend/src/main/java/com/payshield/backend/repository/AuditEventRepository.java
[FILE] backend/src/main/java/com/payshield/backend/repository/FraudAssessmentRepository.java
[FILE] backend/src/main/java/com/payshield/backend/repository/FraudRuleRepository.java
[FILE] backend/src/main/java/com/payshield/backend/repository/IdempotencyRecordRepository.java
[FILE] backend/src/main/java/com/payshield/backend/repository/MerchantRepository.java
[FILE] backend/src/main/java/com/payshield/backend/repository/PaymentRepository.java
[FILE] backend/src/main/java/com/payshield/backend/repository/ReconciliationJobRepository.java
[FILE] backend/src/main/java/com/payshield/backend/repository/ReconciliationMismatchRepository.java
[FILE] backend/src/main/java/com/payshield/backend/repository/RefundRepository.java
[FILE] backend/src/main/java/com/payshield/backend/repository/SettlementRepository.java
[FILE] backend/src/main/java/com/payshield/backend/repository/TransactionRepository.java
[FILE] backend/src/main/java/com/payshield/backend/repository/UserRepository.java
[FILE] backend/src/main/java/com/payshield/backend/repository/WalletRepository.java
[DIR]  backend/src/main/java/com/payshield/backend/security
[FILE] backend/src/main/java/com/payshield/backend/security/JwtAuthenticationFilter.java
[FILE] backend/src/main/java/com/payshield/backend/security/JwtService.java
[FILE] backend/src/main/java/com/payshield/backend/security/RateLimitFilter.java
[DIR]  backend/src/main/java/com/payshield/backend/service
[FILE] backend/src/main/java/com/payshield/backend/service/AuditService.java
[FILE] backend/src/main/java/com/payshield/backend/service/AuthenticationService.java
[FILE] backend/src/main/java/com/payshield/backend/service/FraudService.java
[FILE] backend/src/main/java/com/payshield/backend/service/MerchantService.java
[FILE] backend/src/main/java/com/payshield/backend/service/NotificationService.java
[FILE] backend/src/main/java/com/payshield/backend/service/OtpService.java
[FILE] backend/src/main/java/com/payshield/backend/service/PaymentService.java
[FILE] backend/src/main/java/com/payshield/backend/service/ReconciliationService.java
[FILE] backend/src/main/java/com/payshield/backend/service/RefundService.java
[FILE] backend/src/main/java/com/payshield/backend/service/ReportService.java
[FILE] backend/src/main/java/com/payshield/backend/service/SettlementService.java
[FILE] backend/src/main/java/com/payshield/backend/service/TokenBlacklistService.java
[FILE] backend/src/main/java/com/payshield/backend/service/WalletService.java
[DIR]  backend/src/main/resources
[FILE] backend/src/main/resources/application.yml
[DIR]  backend/src/main/resources/db
[DIR]  backend/src/main/resources/db/migration
[FILE] backend/src/main/resources/db/migration/V10__create_transactions_table.sql
[FILE] backend/src/main/resources/db/migration/V11__fix_transactions_id_type.sql
[FILE] backend/src/main/resources/db/migration/V12__add_session_version.sql
[FILE] backend/src/main/resources/db/migration/V13__add_optimistic_locking_to_wallet.sql
[FILE] backend/src/main/resources/db/migration/V1__init_users_table.sql
[FILE] backend/src/main/resources/db/migration/V2__init_merchants_table.sql
[FILE] backend/src/main/resources/db/migration/V3__init_payments_table.sql
[FILE] backend/src/main/resources/db/migration/V4__init_fraud_table.sql
[FILE] backend/src/main/resources/db/migration/V5__init_refunds_table.sql
[FILE] backend/src/main/resources/db/migration/V6__init_reconciliation_table.sql
[FILE] backend/src/main/resources/db/migration/V7__init_settlement_table.sql
[FILE] backend/src/main/resources/db/migration/V8__init_audit_table.sql
[FILE] backend/src/main/resources/db/migration/V9__init_wallets_table.sql
[DIR]  backend/src/test
[DIR]  backend/src/test/java
[DIR]  backend/src/test/java/com
[DIR]  backend/src/test/java/com/payshield
[DIR]  backend/src/test/java/com/payshield/backend
[DIR]  backend/src/test/java/com/payshield/backend/service
[FILE] backend/src/test/java/com/payshield/backend/service/FraudServiceTest.java
[FILE] backend/src/test/java/com/payshield/backend/service/WalletServiceTest.java
[FILE] backend/utkarsh_test.py
[DIR]  cred-wallet
[FILE] cred-wallet/.gitignore
[FILE] cred-wallet/.oxlintrc.json
[FILE] cred-wallet/README.md
[FILE] cred-wallet/index.html
[FILE] cred-wallet/package-lock.json
[FILE] cred-wallet/package.json
[DIR]  cred-wallet/public
[FILE] cred-wallet/public/favicon.svg
[FILE] cred-wallet/public/icons.svg
[DIR]  cred-wallet/src
[FILE] cred-wallet/src/App.css
[FILE] cred-wallet/src/App.tsx
[DIR]  cred-wallet/src/assets
[FILE] cred-wallet/src/assets/hero.png
[FILE] cred-wallet/src/assets/react.svg
[FILE] cred-wallet/src/assets/vite.svg
[DIR]  cred-wallet/src/context
[FILE] cred-wallet/src/context/AuthContext.tsx
[FILE] cred-wallet/src/index.css
[FILE] cred-wallet/src/main.tsx
[FILE] cred-wallet/src/mockData.ts
[DIR]  cred-wallet/src/pages
[FILE] cred-wallet/src/pages/Dashboard.tsx
[FILE] cred-wallet/src/pages/Login.tsx
[FILE] cred-wallet/src/pages/Signup.tsx
[FILE] cred-wallet/src/pages/Transfer.tsx
[FILE] cred-wallet/tsconfig.app.json
[FILE] cred-wallet/tsconfig.json
[FILE] cred-wallet/tsconfig.node.json
[FILE] cred-wallet/vite.config.ts
[FILE] docker-compose.yml
[DIR]  docs
[DIR]  docs/agile
[FILE] docs/agile/JIRA_Backlog_Export.csv
[FILE] docs/agile/Sprint_Retrospectives.md
[DIR]  docs/incidents
[FILE] docs/incidents/INC-4029_Post_Mortem.md
[DIR]  docs/sops
[FILE] docs/sops/Incident_Response_SOP.md
[DIR]  frontend
[FILE] frontend/.dockerignore
[FILE] frontend/.gitignore
[FILE] frontend/.oxlintrc.json
[FILE] frontend/Dockerfile
[FILE] frontend/README.md
[FILE] frontend/index.html
[FILE] frontend/package-lock.json
[FILE] frontend/package.json
[DIR]  frontend/public
[FILE] frontend/public/favicon.svg
[FILE] frontend/public/icons.svg
[DIR]  frontend/src
[FILE] frontend/src/App.css
[FILE] frontend/src/App.tsx
[DIR]  frontend/src/assets
[FILE] frontend/src/assets/hero.png
[FILE] frontend/src/assets/react.svg
[FILE] frontend/src/assets/vite.svg
[DIR]  frontend/src/context
[FILE] frontend/src/context/AuthContext.tsx
[FILE] frontend/src/index.css
[FILE] frontend/src/main.tsx
[FILE] frontend/src/mockData.ts
... (truncated)
```

## 4. Technical Architecture & Component Knowledge

### Domain: Technical Decision

#### Asynchronous Fraud Telemetry and Model Retraining Pipeline
- **Affected Module:** `risk-engine`
- **AI Confidence Score:** 95%

**Executive Summary:**
Decoupled real-time transaction scoring from logging and retraining using Celery and Redis.

**Implementation Details & Context:**
In the FastAPI risk-engine service, the /predict endpoint evaluates transaction fraud probability synchronously to meet low-latency SLAs. Once evaluated, it dispatches an asynchronous background task via Celery (log_transaction_async) to persist transaction telemetry features for offline analysis. Additionally, a dedicated /retrain endpoint enqueues a heavy background model retraining task (retrain_model_task) to update the fraud detection model version without blocking API event loops.

**Traceability & Evidence (Code Pointers):**
- `risk-engine/main.py`
- `risk-engine/celery_worker.py`

---

### Domain: Configuration

#### Containerized Multi-Service Architecture via Docker Compose
- **Affected Module:** `Global/System-wide`
- **AI Confidence Score:** 98%

**Executive Summary:**
Orchestrates databases, caches, email testing servers, backend, frontend, and risk workers in Docker.

**Implementation Details & Context:**
The root docker-compose.yml defines a complete local and staging topology including PostgreSQL 15 with health checks, Redis 7 alpine cache, Mailpit for SMTP testing, Spring Boot backend, React frontend, FastAPI risk-engine, and a separate Celery worker container configured with environment injection and inter-service dependencies.

**Traceability & Evidence (Code Pointers):**
- `docker-compose.yml`

---

#### Database Schema Management with Flyway
- **Affected Module:** `backend`
- **AI Confidence Score:** 90%

**Executive Summary:**
Automates database schema initialization and migrations across deployments.

**Implementation Details & Context:**
Spring Boot starter flyway and flyway-database-postgresql are configured in the Maven build file to ensure repeatable, version-controlled database schema migrations against the PostgreSQL container instance defined in Docker Compose.

**Traceability & Evidence (Code Pointers):**
- `backend/pom.xml`
- `docker-compose.yml`

---

#### Distributed Task Queue Broker Configuration
- **Affected Module:** `risk-engine`
- **AI Confidence Score:** 93%

**Executive Summary:**
Celery workers connected via Redis broker and backend for scalable background processing.

**Implementation Details & Context:**
In the risk-engine celery_worker.py, Celery is configured to use Redis as both broker and result backend with JSON serialization and UTC timezone enforcement, powering both the async logging tasks and model retraining jobs.

**Traceability & Evidence (Code Pointers):**
- `risk-engine/celery_worker.py`
- `docker-compose.yml`

---

### Domain: Implementation Detail

#### Concurrent Wallet Transfers and Race Condition Testing
- **Affected Module:** `backend`
- **AI Confidence Score:** 92%

**Executive Summary:**
Python concurrency test harness validates thread-safety, rate-limiting, and optimistic locking.

**Implementation Details & Context:**
The backend repository includes a concurrency_test.py script that authenticates a user and spawns multiple concurrent worker threads hammering the wallet transfer endpoint. This verifies that the system correctly returns HTTP 429 (Too Many Requests) for rate limiting and HTTP 409 (Conflict) when optimistic locking prevents race conditions and double-spending on wallet balances.

**Traceability & Evidence (Code Pointers):**
- `backend/concurrency_test.py`

---

#### Rule-Based and Heuristic Fraud Scoring Logic
- **Affected Module:** `risk-engine`
- **AI Confidence Score:** 94%

**Executive Summary:**
Simulates a decision tree classifier with contextual device and email heuristics.

**Implementation Details & Context:**
The FastAPI risk evaluation engine analyzes transaction amount, SIM ICCID, device ID, and customer email. It flags unknown devices ('DEV-UNKNOWN'), suspicious email domains ('suspicious.com'), and high transaction amounts (>5000 or >10000) to cumulatively compute and cap fraud probability scores up to 0.99 before returning model version metadata.

**Traceability & Evidence (Code Pointers):**
- `risk-engine/main.py`

---

### Domain: Dependency

#### Spring Boot Enterprise Backend Stack
- **Affected Module:** `backend`
- **AI Confidence Score:** 96%

**Executive Summary:**
Leverages modern Spring Boot 4.1 ecosystem with Flyway migrations, JPA, and JWT security.

**Implementation Details & Context:**
The backend pom.xml specifies Java 21 and Spring Boot 4.1.1 with starters for Web, Data JPA, Security, Validation, Mail, Actuator, and Data Redis. It integrates Flyway with PostgreSQL for database schema migrations and uses JJWT 0.12.3 libraries for stateless JWT authentication and authorization.

**Traceability & Evidence (Code Pointers):**
- `backend/pom.xml`

---

### Domain: Module Responsibility

#### Development Email Testing Infrastructure via Mailpit
- **Affected Module:** `Global/System-wide`
- **AI Confidence Score:** 88%

**Executive Summary:**
Provides local SMTP capture and inspection for notification and auth workflows.

**Implementation Details & Context:**
The docker-compose setup includes Mailpit mapped to ports 1025 (SMTP) and 8025 (Web UI), allowing developers to inspect outgoing emails generated by the Spring Boot backend without sending live external communications.

**Traceability & Evidence (Code Pointers):**
- `docker-compose.yml`

---

