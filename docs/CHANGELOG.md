# Changelog

## 2025-10-18
- Ingest service now writes every manual submission and Excel upload into the `saleforecast` history table with metadata, allowing the Preview History tab to surface newly submitted lines immediately (`services/ingest-service/src/services/ingest.service.ts`, `services/ingest-service/src/routes/ingest.ts`).
- Documented the `/v1/saleforecast` response schema, metadata contract, and ingest integration in `docs/04-API.md`.
- Backfilled existing `fact_forecast` runs into `saleforecast` and aligned Docker Compose with Postgres 15 to keep the shared volume compatible (`docker-compose.backend.yml`).
- Preview History grid now mirrors the original spreadsheet columns and supports edit/delete actions powered by the `/v1/saleforecast` API (`frontend/src/pages/HomePage.tsx`, `frontend/src/components/HistoryTable.tsx`, `frontend/src/services/api.ts`).

## 2025-10-17
- Updated `docs/04-API.md` to document `/v1/saleforecast` CRUD contract and audit logging requirements.
- Implemented corresponding endpoints, data models, and audit trail support in `services/data-service` to align with the new API specification.
- Hardened ingest upload by validating column types, logging failures, and returning inserted row counts (`services/ingest-service/src/routes/ingest.ts`, `services/ingest-service/src/services/ingest.service.ts`).
- Refined the upload experience: block invalid files with detailed feedback, surface inserted counts, and show an Excel-style preview grid (`frontend/src/pages/HomePage.tsx`, `frontend/src/components/EditableGrid.tsx`, `frontend/src/services/api.ts`).
- Added "Preview History Data" tab with filters and read-only grid, wired history API client, and introduced reusable read-only grid component (`frontend/src/pages/HomePage.tsx`, `frontend/src/components/ReadOnlyGrid.tsx`, `frontend/src/services/api.ts`).
- Notification bell now routes to System Logs and log details surface uploader id/username when present (`frontend/src/ui/AppLayout.tsx`, `frontend/src/pages/LogsPage.tsx`).
