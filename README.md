# PRISM — Problem-oriented Inpatient Review & Structured Monitoring

A mobile-first clinical documentation and handover frontend connected to the existing PRISM Supabase database.

## Included
- Supabase email/password authentication
- Role-aware navigation
- Authorized patient list/dashboard
- Admission summary
- Daily follow-up append-only entries
- Timeline
- Specialist review display
- Admin reference-data view
- Mobile-first UI

## Important
This build is a working implementation baseline, not a declaration of clinical-production readiness. Complete security/RLS review, audit verification, deletion lifecycle testing, backup/recovery planning, and hospital governance before entering real patient data.

No service-role secret is included. The frontend uses the Supabase publishable key, which must remain protected by correct RLS policies.

## Deployment
The app is a single static `index.html`, so it can be hosted on free static hosting such as GitHub Pages or Cloudflare Pages.
