# GetJackedCoach Architecture

## Source of truth

MongoDB is the source of truth for user accounts, training maxes, program weeks,
workouts, templates, PRs, progress entries, and recommendations. The React app
uses REST for reads and writes; WebSocket events only prompt clients to refetch.

```text
React -> Axios REST -> Express auth/routes/controllers -> shared services -> Mongoose -> MongoDB Atlas
      <- JSON responses                                      <- stored records

React <- authenticated /realtime WebSocket <- successful REST writes
       (minimal user-scoped invalidation events, not persistence)
```

The REST service layer contains workout, program, analytics, progress, and PR
operations. Controllers validate requests and pass `req.user.id` into those
services. The WebSocket server verifies a JWT sent in the first message, looks
up the user, and keeps connections in user-scoped in-memory sets. Workout and
progress events contain IDs and event metadata, not full documents. The client
reconnects with bounded backoff and refetches authoritative REST data.

## AI Coach

```text
React Coach -> authenticated Express /api/coach/chat or /api/coach/chat/stream
            -> OpenAI Responses API agent
            -> allowlisted, validated read-only tools
            -> the same program/workout/analytics/PR services
            -> MongoDB Atlas
            -> minimized tool result -> model answer -> React
```

The model chooses whether to request a tool. It cannot choose a user ID or
query MongoDB directly. Tool execution receives identity only from auth
middleware, validates arguments, and has a five-round limit. Streaming uses an
authenticated HTTP response with status, text delta, complete, and error
events; it does not require WebSockets. `OPENAI_API_KEY` stays server-side.
Provider availability is not guaranteed by mocked tests and requires a live
credential check in the deployment environment.

## Deployment status

- The frontend includes Vercel SPA rewrites and uses `VITE_API_URL` for its
  production API origin. The public site URL is `https://getjackedcoach.com`.
- The backend is a Node/Express process with a production Dockerfile and a
  liveness endpoint at `/api/health`. Its hosting platform, image registry,
  secrets store, and rollout configuration are not defined in this repository.
- MongoDB Atlas is configured via `MONGO_URI`. No MongoDB service is bundled in
  Docker Compose, which is for local development only.
- There is no AWS infrastructure as code or evidence of an active AWS deploy.
  The Dockerfile is a starting artifact, not proof of AWS readiness.

## Operational limits

- `/api/health` reports process liveness, not MongoDB/OpenAI readiness.
- WebSocket connection maps are process-local. A multi-instance backend needs
  a shared event bus (for example Redis pub/sub) or routing that guarantees
  events reach every instance holding that user's connections. REST writes
  continue even if real-time delivery fails.
- Logs are written to stdout/stderr. No centralized metrics, tracing, alerting,
  or log retention configuration exists in this repository.
- JWTs are stored in frontend `localStorage` for this MVP. Password reset and
  refresh-token rotation are not implemented.
