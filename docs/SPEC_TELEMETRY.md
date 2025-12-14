# 🕵️ Spec: Telemetry Pipeline (Sprint 3)

> **Goal**: Track basic usage stats (DAU, Activations) without exposing user data.
> **Privacy**: NO PII (Personally Identifiable Information), NO SQL content.

## 1. Cloud Architecture (Worker Proxy)

We use the Worker as a reverse proxy to sanitize data before it hits the analytics provider (PostHog).

*   **Endpoint**: `POST https://api.wansan.app/v1/ingest`
*   **Forward To**: `https://us.i.posthog.com/capture/` (or EU).

### 1.1 Why Proxy?
1.  **Anti-Block**: Ad-blockers block `posthog.com`, but trust `wansan.app`.
2.  **Compliance**: We can strip IP addresses at the Edge before forwarding.
3.  **China**: Direct connection to PostHog is slow/blocked. CF Edge is faster.

## 2. Worker Implementation (`wansan-cloud/src/index.ts`)

Add a new route.

```typescript
// POST /v1/ingest
app.post('/v1/ingest', async (c) => {
  const body = await c.req.json()
  
  // 1. Sanitize: Remove IP to protect privacy
  const headers = new Headers({
    'Content-Type': 'application/json',
    // Hardcode PostHog Project Key here or in Env
  })

  // 2. Forward to PostHog
  // Note: PostHog Batch API structure
  const response = await fetch('https://us.i.posthog.com/capture/', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  
  return c.json({ status: response.status })
})
```

## 3. Client Implementation (`AnalyticsService`)

A lightweight wrapper around `fetch`.

*   **File**: `src/renderer/src/services/analytics.ts`
*   **Events**:
    *   `app_launched`: (version, os)
    *   `beta_activated`: (code_used)
    *   `report_generated`: (duration_ms, file_type, viz_type)
    *   **NEVER TRACK**: File names, column names, SQL queries.

## 4. Implementation Steps

1.  **Cloud**: Update Worker code to add `/v1/ingest`. Deploy.
2.  **Client**: Create `AnalyticsService`.
3.  **Hook**: Call `Analytics.track('app_launched')` in `App.tsx`.
