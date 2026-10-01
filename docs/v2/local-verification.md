# InkHunt v2 local verification

The v2 harness runs a dedicated Supabase project named `inkhunt-v2`. It uses ports `56320`–`56329` and does not touch the pre-existing `inkhunt` Docker volumes or the default `5432x` ports. It starts the real Postgres, Auth, REST, Storage, Realtime and gateway services while omitting optional local dashboards and observability services to keep the disk footprint manageable.

Install the locked dependencies with npm 11. The machine's npm 10.9.8 has an optional-peer resolution bug for the nested SWC helper used by `next-intl`.

```bash
npx npm@11.6.2 ci
```

## Start and seed

```bash
./scripts/v2-supabase-up
./scripts/v2-supabase-seed
./scripts/v2-dev
```

Open the app at <http://127.0.0.1:3200>. The local API is at <http://127.0.0.1:56321> and Postgres listens on port `56322`. Studio and local mail are intentionally omitted from the minimal stack.

The startup script writes local credentials to the ignored `.env.local` and `.env.test.local` files with mode `0600`. It reads the credentials from the running local CLI stack and does not copy a production environment file. It also sets `INKHUNT_LOCAL_TEST=true`; together with the exact local API URL, this disables external LINE notifications during acceptance tests.

Run the persisted-data acceptance flow after the app is listening on port `3200`:

```bash
node scripts/v2-acceptance.mjs
```

## Real login fixtures

In development, use the **Dev Login** picker in the site navigation. The seeded roles are:

- Consumer with inquiries: `consumer-001` (小明)
- Fresh consumer: `consumer-002` (小美)
- Consumer with quote requests: `consumer-003` (阿偉)
- Active artists: `artist-inked-wolf`, `artist-sakura-ink`, `artist-shadow-line`
- Pending artists: `artist-new-talent`, `artist-bare-bones`
- Admin and artist: `U770e3788b27c6cdeb9248b9f7139f171` (Harvey)

These are real local Supabase Auth users. The seed wrapper also repairs and verifies `app_metadata.line_user_id`, which the application and RLS policies use as the trusted identity.

## Inspect and stop

```bash
./scripts/v2-supabase-status
./scripts/v2-supabase-down
```

Stopping preserves the v2 database volume. The scripts never call `db reset`, `stop --all`, or `stop --no-backup`.
