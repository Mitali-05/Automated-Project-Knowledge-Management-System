# Software Architecture & Knowledge Document: UtkarshMudgal2802droid/payshield

> *Generated Autonomously by PRISM Agentic Extraction*

## 1. Executive Summary & Problem Statement
Modern digital commerce demands high-throughput, fault-tolerant payment processing systems capable of sub-second fraud detection, strict idempotency enforcement, asynchronous settlement reconciliation, and secure merchant lifecycle management. Without a unified ledger and robust transaction state machine, platforms suffer from duplicate charges, race conditions, unhandled fraud vectors, and manual reconciliation discrepancies.

PayShield solves these challenges by providing an enterprise-grade, simulated payment gateway mirroring architectures like Stripe or Adyen. It features atomic state transitions, distributed idempotency keys, multi-layered risk heuristic evaluation via async worker pools, secure API key-based merchant onboarding, and automated CSV bank reconciliation workflows, ensuring uncompromising reliability and financial auditability.

## 2. Business Value & Presentation Deck
**Pitch:** PayShield is a turnkey, enterprise-grade payment and risk mitigation platform built to replicate Tier-1 payment processors. By combining rigorous atomic transaction state machines, distributed idempotency, asynchronous AI/heuristic fraud screening, and automated financial reconciliation, PayShield eliminates double-charging risks, slashes fraud false positives, and provides instant audit compliance for modern digital merchants.

**Value:** Accelerates time-to-market for fintech applications, protects merchant revenue via real-time sub-second fraud interception, eliminates costly manual bank reconciliation errors through automated CSV matching, and ensures absolute financial compliance via immutable audit trails.

**Challenges:** Solving distributed transaction race conditions under high concurrency using idempotency keys, coordinating mixed Java Spring Boot and Python FastAPI microservices over shared PostgreSQL and Redis instances, and implementing complex payment lifecycle state transitions (Initiated -> Fraud Check -> Authorized -> Captured/Refunded) without data corruption.

**Future Scope:** Integration with live PSP testnets (Stripe/PayPal), multi-currency dynamic conversion, machine learning-based adaptive fraud scoring models, webhook signature verification UI, and Kafka-backed event streaming for high-frequency settlement processing.

## 3. Analytics & Flowchart
- **Complexity:** High
- **Modules:** 6
- **Security:** JWT Authentication, RBAC, API Key Hashing, & Secure CORS
```mermaid
graph TD
  subgraph Client Tier
    UI[React 18 SPA / Dashboard]
    API_CLIENT[Merchant API Client]
  end

  subgraph API Gateway / Edge
    NGINX[Docker Gateway / Ports 8050/5173]
  end

  subgraph Core Backend Tier (Spring Boot 3.3)
    CONTROLLERS[REST Controllers & RBAC]
    SERVICES[Transactional Service Layer]
    IDEMPOTENCY[Idempotency & State Machine Engine]
  end

  subgraph Async Risk & Fraud Tier (Python FastAPI & Celery)
    RISK_API[FastAPI Risk Service]
    CELERY_WORKER[Celery Fraud Worker]
  end

  subgraph Data & Infra Tier
    PG[(PostgreSQL 15 DB)]
    REDIS[(Redis Cache / Broker)]
    MAIL[Mailpit SMTP Server]
  end

  UI --> NGINX
  API_CLIENT --> NGINX
  NGINX --> CONTROLLERS
  CONTROLLERS --> SERVICES
  SERVICES --> IDEMPOTENCY
  IDEMPOTENCY --> PG
  SERVICES --> REDIS
  SERVICES --> RISK_API
  RISK_API --> CELERY_WORKER
  CELERY_WORKER --> PG
  SERVICES --> MAIL
```

## 4. Technology Stack
- Java 21
- Spring Boot 3.3
- Spring Security (JWT)
- Spring Data JPA
- Flyway
- React 18
- TypeScript
- Material UI
- Recharts
- Python 3.11
- FastAPI
- Celery
- PostgreSQL 15
- Redis
- Mailpit
- Docker & Docker Compose
- Maven
- GitHub Actions

## 5. Engineering Handover Guide

### Local Setup & Prerequisites
System Tools: Docker & Docker Compose, Java 21, Node.js 18+, Maven.
Required .env keys:
  DB_USER=payshield
  DB_PASSWORD=secretpassword
  JWT_SECRET=your_super_secret_jwt_key_here
Exact CLI steps to run:
  1. docker-compose up -d
  2. cd backend && ./mvnw spring-boot:run
  3. cd frontend && npm install && npm run dev

### Directory Tour
- **`backend/src/main/java/com/payshield/`**: Core Spring Boot domain logic containing controllers, services, entities, and repositories for merchants, payments, refunds, settlements, and reconciliation.
- **`frontend/src/`**: React 18 single-page application with TypeScript, Material UI, and Recharts for merchant analytics and operations dashboards.
- **`risk-engine/`**: Python FastAPI and Celery worker service performing asynchronous risk heuristic evaluations and fraud checks.
- **`cred-wallet/`**: Simulated card and credential wallet module for tokenized payment methods.
- **`docs/`**: Enterprise artifact documentation including agile sprint logs, incident post-mortems, and operations SOPs.

### Critical Workflows
**Idempotent Payment Authorization & Fraud Pipeline**
- *Entry:* `backend/src/main/java/com/payshield/controller/PaymentController.java`
- *Path:* `Client POST /api/v1/payments -> PaymentController -> PaymentService (Idempotency Check via Header) -> Database State Update (INITIATED) -> Risk Engine FastAPI / Celery Worker -> Fraud Heuristic Evaluation -> Database State Update (AUTHORIZED / FAILED) -> Response to Client`

### Technical Debt & Fragility
- The Python Celery worker relies on shared PostgreSQL connection pools which under extreme load can exhaust connection limits without PgBouncer.
- Idempotency caching is currently database-backed rather than Redis-backed, introducing slight latency overhead for high-frequency duplicate detection.

## 6. Repository Structure
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

## 7. Technical Architecture & Component Knowledge

### Domain: Technical Decision

#### Distributed Idempotency Enforcement
- **Affected Module:** `backend/src/main/java/com/payshield/service/PaymentService.java`
- **AI Confidence Score:** 99%

**Executive Summary:**
Payments require strict prevention of double-charging caused by network retries.

**Implementation Details & Context:**
The system mandates an `Idempotency-Key` header on payment requests. The backend checks existing transaction logs tied to the merchant API key before executing state transitions.

**Traceability & Evidence (Code Pointers):**
- `concurrency_test.py`
- `PaymentService.java`

---

#### Atomic Payment Lifecycle State Machine
- **Affected Module:** `backend/src/main/java/com/payshield/model/`
- **AI Confidence Score:** 98%

**Executive Summary:**
Guiding payments through strict, un-bypassable lifecycle states.

**Implementation Details & Context:**
Transactions move deterministically from INITIATED -> FRAUD_CHECK -> AUTHORIZED/FAILED -> CAPTURED/REFUNDED, enforced at the service and database constraint layer.

**Traceability & Evidence (Code Pointers):**
- `README.md`

---

### Domain: Architecture

#### Asynchronous Fraud Risk Evaluation
- **Affected Module:** `risk-engine/`
- **AI Confidence Score:** 97%

**Executive Summary:**
Decoupling real-time payment ingestion from heavy risk and heuristic analysis.

**Implementation Details & Context:**
Incoming payments trigger an evaluation via Python FastAPI and Celery workers backed by Redis, enabling millisecond risk scoring without blocking the primary transaction thread.

**Traceability & Evidence (Code Pointers):**
- `docker-compose.yml`
- `risk-engine/`

---

#### Flyway Database Migration Management
- **Affected Module:** `backend/src/main/resources/db/migration/`
- **AI Confidence Score:** 97%

**Executive Summary:**
Version-controlled schema evolution across environments.

**Implementation Details & Context:**
Flyway manages PostgreSQL schema migrations automatically upon Spring Boot startup, ensuring database parity across local Docker and staging environments.

**Traceability & Evidence (Code Pointers):**
- `README.md`

---

### Domain: Feature

#### Automated CSV Bank Reconciliation
- **Affected Module:** `backend/src/main/java/com/payshield/service/ReconciliationService.java`
- **AI Confidence Score:** 95%

**Executive Summary:**
Automated matching of captured database records against external bank settlement files.

**Implementation Details & Context:**
The reconciliation engine parses simulated CSV bank statements, comparing ledger amounts against database captures and automatically flagging anomalies or discrepancies.

**Traceability & Evidence (Code Pointers):**
- `README.md`

---

### Domain: Security

#### Merchant API Key Authentication & RBAC
- **Affected Module:** `backend/src/main/java/com/payshield/security/`
- **AI Confidence Score:** 98%

**Executive Summary:**
Secure multi-tenant access control for merchants and administrators.

**Implementation Details & Context:**
Spring Security enforces JWT authentication for dashboard users and API key validation headers for programmatic payment submissions.

**Traceability & Evidence (Code Pointers):**
- `README.md`

---

### Domain: Business Logic

#### Automated Fee Deduction & Settlement Batching
- **Affected Module:** `backend/src/main/java/com/payshield/service/SettlementService.java`
- **AI Confidence Score:** 96%

**Executive Summary:**
Daily batch aggregation of captured funds with simulated platform fee deductions.

**Implementation Details & Context:**
Settlements aggregate daily captured transactions, deduct a standard 2.9% simulation processing fee, and generate merchant payout records.

**Traceability & Evidence (Code Pointers):**
- `README.md`

---

### Domain: Infrastructure

#### Mailpit SMTP Integration for Notifications
- **Affected Module:** `docker-compose.yml`
- **AI Confidence Score:** 95%

**Executive Summary:**
Local email simulation for transaction receipts and security alerts.

**Implementation Details & Context:**
Dockerized Mailpit captures all outbound SMTP notifications from Spring Boot without dispatching real external emails during development and testing.

**Traceability & Evidence (Code Pointers):**
- `docker-compose.yml`

---

### Domain: Frontend

#### React Recharts Financial Dashboards
- **Affected Module:** `frontend/src/`
- **AI Confidence Score:** 95%

**Executive Summary:**
Real-time analytics visualization for merchant transaction volumes and revenue.

**Implementation Details & Context:**
The frontend SPA utilizes React, TypeScript, Material UI, and Recharts to render interactive financial graphs and metrics.

**Traceability & Evidence (Code Pointers):**
- `README.md`

---

### Domain: Testing

#### Concurrency Stress Testing Suite
- **Affected Module:** `backend/concurrency_test.py`
- **AI Confidence Score:** 96%

**Executive Summary:**
Python-based concurrency scripts to validate race condition resilience.

**Implementation Details & Context:**
A dedicated concurrency testing script fires simultaneous identical payment requests to verify database locking and idempotency protection.

**Traceability & Evidence (Code Pointers):**
- `backend/concurrency_test.py`

---

