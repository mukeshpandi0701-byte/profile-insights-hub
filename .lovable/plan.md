# ProfilePulse implementation plan

## Product foundation
- Build authenticated organization workspaces with administrator and member roles, protected pages, and organization-scoped access.
- Add a restrained responsive dashboard shell with navigation for overview, members, imports, monitoring, reports, and settings.

## Data and security
- Create relational tables for organizations, memberships/roles, departments, members, imports, platform profiles, monitoring jobs/results, reports, and settings.
- Apply row-level organization isolation, role checks, indexes, timestamps, validation constraints, and safe delete behavior.
- Keep provider credentials server-only; uploaded spreadsheets are parsed in-browser and only validated records are persisted.

## Excel import and member management
- Add `.xlsx`/`.xls` parsing, required-column and row validation, URL normalization, duplicate detection, editable preview, valid-row import, counts, error export, and sample template download.
- Add searchable/filterable/paginated member management, detail/edit/delete/bulk delete, and Excel export.

## Monitoring
- Implement real GitHub API checks through server functions, with optional authenticated connector access, public API fallback, rate-limit/error handling, throttled bulk jobs, retries, history, freshness, and transparent classification.
- Record LinkedIn URLs and official-integration status without scraping or invented activity; show unavailable/not-configured states until authorized access exists.
- Support configurable thresholds and monitoring frequency. Prevent duplicate active jobs for the same profile.

## Dashboard and reports
- Compute organization-scoped dashboard totals, department summaries, activity distribution, success rate, and recent events from stored results.
- Generate filtered full/department/date-range reports and export Excel, CSV, and printable PDF output with clear data-availability language.

## Reliability and documentation
- Add focused tests for URL/import validation, duplicate handling, classification, GitHub response/rate-limit behavior, and report shaping.
- Document setup, permissions, monitoring limits, environment variables, and operation.
- Verify sign-in, organization creation, import, member management, GitHub monitoring, dashboard updates, and report export in the running app.

## Technical details
- TanStack Start server functions for authenticated application operations; Lovable Cloud for auth and persistent relational storage.
- `xlsx` for spreadsheet import/export, Zod for validation, and the official GitHub REST API.
- Google and email/password sign-in. GitHub credentials remain optional; unauthenticated public requests work within GitHub's lower rate limit.
- Scheduled monitoring is represented and configurable in-app; automatic execution requires publishing the stable application URL before a secure schedule can be activated.
