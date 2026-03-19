# Automation Runner Deployment

This API supports two automation execution modes:

1. In-process scheduler inside the main API process
2. Dedicated runner via `npm run automations:run`

For production, prefer a dedicated runner when:

- you run more than one API instance
- you deploy in serverless/ephemeral environments
- you want stricter control over cron frequency and logs

## Recommended Environment

Set these env vars on the API service:

```bash
AUTOMATIONS_ENABLED=false
AUTOMATION_INTERVAL_MINUTES=30
```

`AUTOMATIONS_ENABLED=false` prevents the main API from also running the in-process scheduler when a separate cron runner is active.

## Dedicated Runner Command

Run from the backend project root:

```bash
npm run automations:run
```

Optional: run for one condominium only:

```bash
npm run automations:run -- <condominioId>
```

## Common Scheduling Options

### Cron on a VM / bare metal

Run every 30 minutes:

```cron
*/30 * * * * cd /path/to/colmena-prod-api && /usr/bin/npm run automations:run >> /var/log/colmena-automations.log 2>&1
```

### PM2

Use PM2 for the API and OS cron for the runner, or define a separate PM2 app that is triggered externally.

### Render / Railway / Coolify / similar platforms

- Keep the API as the web service
- Add a separate cron job / scheduled worker
- Point it to the same codebase and environment
- Command: `npm run automations:run`
- Disable in-process scheduler on the web service with `AUTOMATIONS_ENABLED=false`

### Vercel

This project is deployed on Vercel, so the recommended production setup is:

- keep the API deployed as the normal Vercel service
- expose a protected cron endpoint at `GET /api/v1/automations/cron`
- configure a `crons` entry in `vercel.json`
- set `CRON_SECRET` in Vercel environment variables
- set `AUTOMATIONS_ENABLED=false` in the API environment so the in-process scheduler does not also run

Vercel Cron will call the endpoint automatically. The endpoint expects:

```bash
Authorization: Bearer <CRON_SECRET>
```

The current schedule in `vercel.json` is every 30 minutes:

```json
{
  "path": "/api/v1/automations/cron",
  "schedule": "*/30 * * * *"
}
```

## Rollout Checklist

1. Apply pending migrations before enabling new automations.
2. Build once with `npm run build`.
3. Keep the web API running with `AUTOMATIONS_ENABLED=false` if a dedicated runner exists.
4. Create the scheduled job with `npm run automations:run`.
5. Check `automation_runs` and application logs after the first execution.

## Validation

You can manually verify the runner with:

```bash
npm run automations:run
```

Then confirm history through the automation endpoints or DB records in `automation_runs`.
