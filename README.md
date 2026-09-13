# ProfilePulse

ProfilePulse is a secure organization workspace for importing member profile URLs, monitoring permitted public GitHub activity, recording honest LinkedIn availability states, and exporting activity reports.

## Features

- Email/password and Google authentication
- Organization-scoped roles and row-level data isolation
- Excel `.xlsx` and `.xls` import with editable row validation, duplicate checks, error export, and sample template
- Searchable, filterable, paginated member directory with bulk deletion and Excel export
- Real GitHub REST API monitoring, public repositories/events, rate-limit reporting, retries, job progress, and monitoring history
- Transparent activity classification using a configurable threshold
- LinkedIn architecture that stores authorization and availability state without scraping or fabricated results
- Dashboard and filtered Excel, CSV, and PDF reports

## Local development

```bash
bun install
bun run dev
```

Lovable Cloud supplies authentication and database environment variables. Do not commit private credentials.

## Optional GitHub credential

Public GitHub monitoring works without a token but is limited by GitHub's unauthenticated API rate limit. For higher limits, securely configure `GITHUB_TOKEN` in project secrets. A fine-grained read-only token needs only public repository/profile read access. The token is read only inside server code and is never sent to browsers.

## LinkedIn

ProfilePulse does not scrape LinkedIn. Until an official LinkedIn application with approved profile/activity products is connected, the UI and reports show `Integration not configured` or `Data unavailable`. A LinkedIn URL alone never produces an activity classification.

## Activity classification

- **Active:** observable public GitHub activity is inside the configured threshold.
- **Inactive:** reliable public data was returned, but the latest qualifying observation is older than the threshold.
- **No observable activity:** public API data was insufficient or contained no qualifying observation.
- **Data unavailable:** the profile cannot be evaluated reliably.
- **Monitoring failed:** the API request failed; this is never treated as inactivity.
- **Not monitored:** no check has run.

## Scheduled monitoring

Administrators can store a daily, weekly, or monthly preference. Automatic scheduled execution needs the app's stable published URL; activate it after publication from **More → Cloud → Jobs**. Manual and bulk monitoring are available immediately.

## Tests

```bash
bun run test
```

The test suite covers URL normalization, import row validation, missing optional links, and classification thresholds. Database row-level access policies are also checked by the Lovable Cloud security linter.

## Data model

Persistent tables cover organizations, roles, departments, settings, import batches, members, GitHub snapshots, LinkedIn integration states, monitoring jobs, monitoring history, and report audit records. Every user-facing table uses row-level access controls, and roles are stored separately from members or profiles.