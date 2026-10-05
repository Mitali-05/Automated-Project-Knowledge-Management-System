# Software Architecture & Knowledge Document: UtkarshMudgal2802droid/payshield

> *Generated Autonomously by PRISM Agentic Extraction*

## 1. Executive Summary & Problem Statement
Modern payment processors, merchant gateways, and digital wallets require robust transactional integrity, millisecond-level fraud detection, strict idempotency enforcement to prevent double-charging, and automated reconciliation pipelines. PayShield provides an enterprise-grade, full-scale synthetic simulation of a payment processing ecosystem (Stripe/Adyen style), combining a Java Spring Boot 3 backend, Python risk assessment services, and TypeScript React/Vite frontends.

## 2. Business Value & Presentation Deck
**Pitch:** PayShield delivers an enterprise-ready payment gateway and fraud-mitigation platform designed to ensure absolute financial ledger accuracy, prevent race conditions through robust idempotency, and automate settlement reconciliation at scale.

**Value:** Eliminates catastrophic double-charge incidents via idempotency guarantees, reduces chargeback rates through millisecond risk analysis, and automates 100% of daily bank reconciliation tasks to slash operational overhead.

**Challenges:** Solving distributed transaction consistency, preventing concurrent double-spending under high concurrency, maintaining strict state transition guardrails across transaction lifecycles, and bridging Java enterprise backend services with Python-based asynchronous risk analytics.

**Future Scope:** Transitioning from a layered monolithic core to a fully event-driven microservices mesh using Kafka, implementing multi-currency real-time FX conversion engines, and adding machine learning-based adaptive fraud scoring.

## 3. Analytics & Flowchart
- **Complexity:** High
- **Modules:** 5
- **Security:** Robust Spring Security with JWT tokens, role-based access control, and dedicated rate-limiting filters.
```mermaid
graph TD
  subgraph Client Layer
    FE[React Frontend / Merchant Dashboard] -->|REST / JWT| API[Spring Boot API Gateway]
    CW[Cred-Wallet / Checkout] -->|REST| API
  end
  subgraph Core Backend Service
    API --> SEC[Spring Security & JWT Filter]
    SEC --> RT[Rate Limit Filter]
    RT --> CTL[Controllers: Transactions, Refunds, Settlements]
    CTL --> SVC[Service Layer: State Machine & Business Logic]
    SVC -->|Idempotency Check| DB[(PostgreSQL)]
  end
  subgraph Async & Risk Engines
    SVC -->|Webhook / Event| RE[Risk Engine (FastAPI)]
    RE -->|Celery Workers| CL[Async Processing / Fraud Rules]
  end
  subgraph Infrastructure
    DB -->|Simulated CSVs| REC[Reconciliation Engine]
    SVC -->|SMTP| MP[Mailpit Notifications]
  end
```

## 4. Technology Stack
- Java 21
- Spring Boot 3.3
- Spring Security
- Spring Data JPA
- PostgreSQL
- Python
- FastAPI
- Celery
- TypeScript
- React 18
- TailwindCSS
- Docker & Docker Compose

## 5. Repository Structure
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

## 6. Technical Architecture & Component Knowledge

### Domain: Architecture Pattern

#### Spring Boot Backend Core & Layered Architecture
- **Affected Module:** `backend`
- **AI Confidence Score:** 98%

**Executive Summary:**
Core enterprise backend structured into clear controllers, services, repositories, and DTOs running on Java 21 and Spring Boot 3.3.

**Implementation Details & Context:**
The backend provides robust transaction handling, merchant management, refunds, and payout settlements backed by Spring Data JPA and PostgreSQL.

**Traceability & Evidence (Code Pointers):**
- `backend/src/main/java/com/payshield/backend/BackendApplication.java`

---

### Domain: Security

#### JWT Authentication and Spring Security Filter Chain
- **Affected Module:** `backend/security`
- **AI Confidence Score:** 95%

**Executive Summary:**
Stateless authentication via JWT tokens coupled with custom filter chains ensuring secure API endpoint access.

**Implementation Details & Context:**
JwtAuthenticationFilter intercepts requests, validates tokens via JwtService, and sets authentication context in Spring Security.

**Traceability & Evidence (Code Pointers):**
- `backend/src/main/java/com/payshield/backend/security/JwtAuthenticationFilter.java`
- `backend/src/main/java/com/payshield/backend/security/JwtService.java`

---

#### API Rate Limiting & Protection Layer
- **Affected Module:** `backend/security`
- **AI Confidence Score:** 92%

**Executive Summary:**
Dedicated rate-limiting filter safeguarding payment endpoints against brute-force and denial-of-wallet attacks.

**Implementation Details & Context:**
RateLimitFilter monitors incoming request frequencies per client or merchant token to protect sensitive payment operations.

**Traceability & Evidence (Code Pointers):**
- `backend/src/main/java/com/payshield/backend/security/RateLimitFilter.java`

---

### Domain: Technical Decision

#### Python FastAPI Risk Assessment Engine
- **Affected Module:** `risk-engine`
- **AI Confidence Score:** 94%

**Executive Summary:**
Secondary microservice built with FastAPI for lightning-fast heuristic risk evaluation and fraud detection.

**Implementation Details & Context:**
Evaluates transaction vectors against rule sets (amount thresholds, suspicious origins) prior to authorization capture.

**Traceability & Evidence (Code Pointers):**
- `risk-engine/main.py`

---

#### Asynchronous Task Processing with Celery
- **Affected Module:** `risk-engine`
- **AI Confidence Score:** 90%

**Executive Summary:**
Celery worker integration supporting asynchronous background processing for high-volume fraud checks and notifications.

**Implementation Details & Context:**
Decouples resource-heavy verification tasks from synchronous API request-response cycles.

**Traceability & Evidence (Code Pointers):**
- `risk-engine/celery_worker.py`

---

### Domain: Infrastructure

#### Docker Compose Multi-Container Orchestration
- **Affected Module:** `root`
- **AI Confidence Score:** 97%

**Executive Summary:**
Comprehensive local deployment configuration orchestrating PostgreSQL, Mailpit SMTP simulation, backend, risk engine, and frontend services.

**Implementation Details & Context:**
Simplifies multi-service development and testing by establishing reproducible container environments.

**Traceability & Evidence (Code Pointers):**
- `docker-compose.yml`

---

### Domain: Ui Ux

#### React TypeScript Dashboard & Recharts Analytics
- **Affected Module:** `frontend`
- **AI Confidence Score:** 93%

**Executive Summary:**
Modern frontend dashboard built with React, TypeScript, and Recharts for real-time transaction monitoring and financial metrics visualization.

**Implementation Details & Context:**
Provides merchants and operators with real-time operational visibility into capture success rates, volume trends, and refund tracking.

**Traceability & Evidence (Code Pointers):**
- `frontend`

---

#### Cred-Wallet Simulated Checkout & Wallet Application
- **Affected Module:** `cred-wallet`
- **AI Confidence Score:** 91%

**Executive Summary:**
Dedicated wallet client interface demonstrating end-to-end customer payment flows and credential storage.

**Implementation Details & Context:**
Acts as the end-user touchpoint for payment authorization and wallet balances.

**Traceability & Evidence (Code Pointers):**
- `cred-wallet`

---

### Domain: Testing

#### Concurrency & Idempotency Testing Harness
- **Affected Module:** `backend`
- **AI Confidence Score:** 96%

**Executive Summary:**
Python concurrency test script designed to stress-test transaction APIs and verify idempotency protections against duplicate charges.

**Implementation Details & Context:**
Fires concurrent identical requests with shared idempotency keys to ensure database state consistency and zero race conditions.

**Traceability & Evidence (Code Pointers):**
- `backend/concurrency_test.py`

---

