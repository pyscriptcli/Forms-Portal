# Workspace notes

- The Forms Portal is a Next.js app using ClickUp as the live workflow system and Supabase for server-side configuration/data when configured.
- RFP Option A starts when a requestor submits the portal form. Option B manual intake is excluded from the current implementation.
- ClickUp status is the milestone source of truth after task creation. The portal groups nine milestone statuses into six stages.
- Finance assigns one continuous global `RFP-MMYYYY-####` sequence at intake. Revisions keep the base reference and use `_Rn` on revised files.
