# API Logging System — Design & Implementation Plan

## 1. Context & Goals

The API currently has no structured logging. Errors are converted to HTTP responses but never recorded, making it difficult to diagnose production incidents after they occur.

This plan introduces a logging system that:

- Captures enough context for a developer to reproduce and fix any production error without needing to reproduce it locally
- Writes to **stdout/stderr in structured JSON** so that any hosting platform (AWS CloudWatch, GCP Cloud Logging, Render.com log drain, a plain VPS with log rotation, etc.) can ingest logs without code changes — only the sink/drain is configured at the infrastructure level
- Obeys **Clean Architecture**: the domain layer remains free of any infrastructure dependency; the logger lives in the infrastructure and presentation layers only

---

## 2. Key Design Decisions

### 2.1 Standard-library logger (`log/slog`)

Go 1.21 introduced `log/slog` as the official structured logger. The project already uses Go 1.23, so this is available with zero new dependencies.

Using `slog.JSONHandler` writing to `os.Stdout` satisfies the platform-agnostic requirement: every cloud platform and VPS treats stdout as the canonical log stream.

```
stdout → platform log collector → search / alerting tooling
```

No log-shipper agent, no SDK from AWS/GCP, no code change when switching providers.

### 2.2 Logger injected via `context.Context`

The logger must not appear in any domain interface or struct — that would couple the domain to an infrastructure concern. Instead:

- A thin `logger` package (inside `utils/` or a new `pkg/logger/`) owns the context key and helper functions.
- HTTP middleware embeds a request-scoped `*slog.Logger` (pre-enriched with `correlation_id`, `method`, `path`) into the context.
- Presentation and data layers retrieve the logger from the context. The domain layer never touches it.

```
HTTP Middleware (attaches logger to ctx)
        │
        ▼
Presentation Layer  ─── reads logger from ctx, logs errors
        │
        ▼
Domain / Use-Case Layer  ─── (no logging, no change)
        │
        ▼
Data / Repository Layer  ─── reads logger from ctx, logs DB errors
```

### 2.3 Log levels

| Level | Used for |
|-------|----------|
| `INFO` | Request received, request completed, application startup |
| `WARN` | Expected-but-notable errors (NotFound, BadRequest, Unauthorized) |
| `ERROR` | Unexpected failures (InternalServerError, DB errors, panics) |
| `DEBUG` | Verbose detail useful during local development (disabled in prod) |

Log level is controlled by the `LOG_LEVEL` environment variable — no code changes needed.

### 2.4 Correlation IDs

Every inbound HTTP request gets a `correlation_id` (UUID v4). It is:

- Generated in the logging middleware if the client does not supply one
- Also accepted from the `X-Correlation-ID` / `X-Request-ID` request header (allows tracing across services)
- Embedded in every log line for that request via the request-scoped logger
- Returned to the client in the `X-Correlation-ID` response header so the client can reference it when reporting an issue

### 2.5 What is logged and where

| Location | What is logged |
|----------|----------------|
| `main.go` (startup) | App started, port, env |
| HTTP middleware | Request start (method, path, IP, correlation_id), request end (status, latency) |
| `presentation/restapi/base_transformers.go` → `WriteError` | Every error response (correlation_id, error code, message, HTTP status) at WARN or ERROR level |
| `data/mysql/base_transformer.go` | Raw DB errors before they are converted to domain errors (logged at ERROR with the original error string) |
| `data/mysql/base_repo.go` | Transaction begin/commit/rollback |

The **domain layer is not touched at all**.

---

## 3. Log Schema

Every log line is a single JSON object on stdout.

```json
{
  "time": "2026-03-27T10:45:01.123Z",
  "level": "ERROR",
  "msg": "request completed with error",
  "service": "gatherloop-pos-api",
  "env": "production",
  "correlation_id": "a1b2c3d4-...",
  "method": "POST",
  "path": "/api/transactions",
  "status": 500,
  "latency_ms": 43,
  "error_code": "INTERNAL_SERVER_ERROR",
  "error_message": "failed to insert transaction"
}
```

Fields present on every line: `time`, `level`, `msg`, `service`, `env`, `correlation_id`.
Fields added contextually: `method`, `path`, `status`, `latency_ms`, `error_code`, `error_message`.

---

## 4. New Files & Changed Files (Summary)

### New files

| File | Purpose |
|------|---------|
| `pkg/logger/logger.go` | Logger factory: creates the root `*slog.Logger` from env vars (`LOG_LEVEL`, `APP_ENV`, `SERVICE_NAME`), exposes context helpers (`FromCtx`, `WithCtx`) |
| `pkg/logger/middleware.go` | HTTP middleware: injects correlation ID + request-scoped logger into context, logs request start/end |

### Changed files

| File | Change |
|------|--------|
| `utils/env.go` | Add `LogLevel`, `AppEnv`, `ServiceName` env fields |
| `main.go` | Initialize root logger; pass it to middleware |
| `presentation/restapi/base_middlewares.go` | Register logging middleware |
| `presentation/restapi/base_transformers.go` | `WriteError` retrieves logger from context and logs the error |
| `data/mysql/base_transformer.go` | Log raw DB errors before converting to domain errors |
| `data/mysql/base_repo.go` | Log transaction lifecycle events |

**Domain layer: zero changes.**

---

## 5. Implementation Phases

Each phase is independently deployable and leaves the system in a working state.

---

### Phase 1 — Foundation (Logger Bootstrap & HTTP Request Logging)

**Scope:** Establish the logging infrastructure and capture every HTTP request/response with timing.

**Deliverables:**

1. `pkg/logger/logger.go`
   - Build a `*slog.Logger` backed by `slog.JSONHandler(os.Stdout, opts)`.
   - Log level controlled by `LOG_LEVEL` env var (`debug` | `info` | `warn` | `error`; default `info`).
   - Root logger includes `service` and `env` attributes on every line.
   - `FromCtx(ctx) *slog.Logger` — returns the logger stored in context, or root logger as fallback.
   - `WithCtx(ctx, logger) context.Context` — stores logger in context.

2. `pkg/logger/middleware.go` — `RequestLogger(rootLogger) mux.MiddlewareFunc`
   - Generates a `correlation_id` (or reads `X-Correlation-ID` header).
   - Clones root logger and adds `correlation_id`, `method`, `path`, `remote_addr`.
   - Stores enriched logger in context via `WithCtx`.
   - Wraps `http.ResponseWriter` to capture status code.
   - After handler returns, logs `msg: "request completed"` with `status` and `latency_ms`.

3. `utils/env.go` — add `LOG_LEVEL`, `APP_ENV`, `SERVICE_NAME` fields.

4. `main.go`
   - Create root logger after env load.
   - Log startup info (`msg: "server starting"`, port, env).
   - Register `logger.RequestLogger` middleware on the router.

5. `.env.example` — document the three new variables.

**Acceptance criteria:**
- Every HTTP request produces two log lines: one at request start, one at request end.
- Both lines share the same `correlation_id`.
- Changing `LOG_LEVEL=debug` in `.env` produces verbose output without recompiling.
- No domain file is changed.

---

### Phase 2 — Error Logging in the Presentation Layer

**Scope:** Log every error response with enough context for a developer to identify the source.

**Deliverables:**

1. `presentation/restapi/base_transformers.go` — update `WriteError`
   - Accept `ctx context.Context` as first parameter (or retrieve from request where possible).
   - Retrieve logger via `logger.FromCtx(ctx)`.
   - Log at `WARN` for `BadRequest`, `NotFound`, `Unauthorized`.
   - Log at `ERROR` for `InternalServerError`.
   - Logged fields: `error_code`, `error_message`, `http_status`.

2. Update all handler call sites for the new `WriteError` signature (pass `r.Context()`).

3. `presentation/restapi/base_middlewares.go` — `CheckAuth`
   - On auth failure, log at WARN with `msg: "authentication failed"` before writing the error response.

**Acceptance criteria:**
- A `500` response always produces an ERROR log line with `correlation_id` and `error_message`.
- A `404` or `401` produces a WARN log line.
- Log lines include `correlation_id` so they can be correlated with the request lifecycle lines from Phase 1.

---

### Phase 3 — Infrastructure Layer Logging (Database & Transactions)

**Scope:** Surface low-level errors from the data layer so that DB failures are visible in logs before they are converted to opaque domain errors.

**Deliverables:**

1. `data/mysql/base_transformer.go` — update `ToError` (or equivalent conversion function)
   - Accept `ctx context.Context`.
   - Before returning a `domain.InternalServerError`, log at ERROR with the raw GORM error string (`err.Error()`).
   - Log fields: `msg: "database error"`, `raw_error`, `operation` (caller-supplied label).

2. `data/mysql/base_repo.go` — transaction logging
   - Log at DEBUG when a transaction begins, commits, or rolls back.
   - On rollback due to an error, log at ERROR with the error detail.

3. Update repository implementations (`*_repo.go`) to pass `ctx` to the error-conversion helpers where it is not already.

**Acceptance criteria:**
- A DB connectivity issue produces an ERROR log with the raw error string before the 500 response is written.
- Transaction rollbacks produce an ERROR log.
- DEBUG-level transaction logs are suppressed when `LOG_LEVEL=info`.

---

### Phase 4 — Use-Case Business Event Logging (Optional / Long-Term)

**Scope:** Log significant business events (e.g. transaction created, wallet updated) to aid in auditing and debugging business logic issues, without modifying the domain layer.

**Approach:** Use cases currently live in the domain layer. Two options that preserve clean architecture:

**Option A (preferred): Thin application-layer wrappers**
Create a new `application/` package that wraps domain use cases. The wrappers log before/after delegating to the domain use case and are injected in `main.go` in place of the bare domain use cases.

```
main.go injects: application.LoggingTransactionUsecase{inner: domain.TransactionUsecase, logger: ...}
```

The domain struct is untouched. The wrapper implements the same interface.

**Option B: Middleware pattern on use-case interfaces**
Same idea, implemented as a decorator pattern. Easier to apply uniformly across all use cases.

**Deliverables:**

1. `application/logging_usecase.go` — generic logging decorator or per-usecase wrappers.
2. Logged events: method name, input summary (no PII), execution duration, error if any.
3. `main.go` — swap bare use cases for decorated versions.

**Acceptance criteria:**
- Business-critical operations (create transaction, update wallet) produce INFO log lines with duration.
- No domain file is changed.
- Disabling DEBUG/INFO log level eliminates business-event noise in production if desired.

---

## 6. Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Minimum log level: `debug`, `info`, `warn`, `error` |
| `APP_ENV` | `development` | Environment name included in every log line |
| `SERVICE_NAME` | `gatherloop-pos-api` | Service name included in every log line |

These are the only operational changes needed when deploying to a new platform. The log output always goes to stdout; the platform decides what to do with it.

---

## 7. Platform-Agnostic Deployment Notes

Because all logs are written to stdout as JSON, no agent or SDK is required on any platform:

| Platform | How to collect logs |
|----------|---------------------|
| AWS (ECS / EC2) | CloudWatch Logs agent reads stdout automatically from ECS tasks; on EC2 pipe to CloudWatch via the unified agent |
| Google Cloud Run / GKE | Cloud Logging ingests container stdout automatically; JSON lines are parsed as structured log entries |
| Render.com | Log drain streams stdout to any HTTP endpoint or to Papertrail/Datadog |
| Plain VPS | Redirect stdout to a file with `journald` or `supervisord`; ship with Filebeat or Promtail to Elasticsearch / Loki |
| Local development | stdout is the terminal; pipe to `jq` for pretty-printing: `./api | jq .` |

---

## 8. Out of Scope

- Distributed tracing (OpenTelemetry spans) — can be added later on top of correlation IDs
- Log sampling / rate limiting — not needed at current traffic volumes
- Sensitive data masking — passwords are never logged; review before adding request body logging
- Centralised log storage setup — this is an infrastructure / DevOps concern, not a code concern
