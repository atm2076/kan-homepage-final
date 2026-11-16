# Khan Content Studio — isolated integration plan

## Safety
- Keep public website and `main` unchanged.
- Do not expose Supabase service-role credentials or admin passwords in client bundles.
- Require Supabase Auth and server-enforced staff/owner roles before exposing private listings or drafts.
- Start with read-only listing access; never write to production listing tables from the studio without explicit approval.

## Existing system
- React + Vite frontend in `src/main.jsx`.
- Supabase client in `src/supabaseClient`.
- Vercel routing in `vercel.json`, including `/listing/:id` -> `/api/listing-seo`.

## Data contracts to implement
- listings_snapshot: listing_id, source, source_updated_at, imported_at, fields_json, public_status, checksum.
- content_projects: listing_id, channel, status, draft_json, author_id, reviewer_id, approved_at.
- content_revisions: project_id, version, diff_json, editor_id, created_at.
- media_assets: listing_id, asset_type, url, verified, capture_needed, copyright_status.
- review_tasks: listing_id, field, required_evidence, status, assignee_id.

## Workflow
1. Inspect current Supabase schema, existing listing access controls and API endpoints.
2. Build separate authenticated studio app and read-only listing synchronization.
3. Compare snapshot changes and flag conflicts with manually entered content.
4. Draft Naver/website SEO and YouTube/TikTok scripts from verified fields only.
5. Require staff submission and owner approval before publication.
6. Integrate with Google Sites as an internal navigation portal after access controls are tested.

No data is considered verified merely because it appears in a sample or generated draft.
