---
name: db-migration
description: >-
  Create and run a MySQL schema migration for apps/api with golang-migrate. Use when adding,
  altering, or dropping a table or column, or when asked to write, run, or roll back a
  migration in this repo.
---

# db-migration

25 migration pairs already exist in `apps/api/data/mysql/migrations/`. They are numbered,
sequential, and each `up` has a matching `down` that actually reverses it — that pairing is
enforced by convention, not by any tool, so get it right by hand.

## 1. Create the pair

From `apps/api`:

```sh
make migrate-create name=add_foo_column
```

This produces the next `0000NN_add_foo_column.up.sql` / `.down.sql` pair. Never number a
migration file by hand — `migrate create -seq` is what keeps the sequence contiguous.

## 2. Write both directions

- `up.sql` makes the change (`ALTER TABLE`, `CREATE TABLE`, a backfill statement, ...).
- `down.sql` must actually reverse it (add ↔ drop column, create ↔ drop table). A `down` that
  is a no-op or approximates the reverse breaks `migrate-down` for everyone after you.
- A backfill for existing rows belongs in the `up.sql` file itself, not in application code.

## 3. Run it

From `apps/api`:

```sh
make migrate-up             # apply all pending migrations
make migrate-down           # roll back the last one
make migrate-version        # print the current version
```

If these fail with a path error, see the `MIGRATIONS_DIR` gotcha below — pass the explicit path
CI uses instead:

```sh
migrate -path apps/api/data/mysql/migrations -database "$DB_URL" up
```

## 4. Propagate the change

A schema change is not a feature by itself. Update, in the same PR:

- the MySQL repository (`data/mysql/<feature>_repo.go`) reading/writing the new column,
- the domain entity,
- `libs/api-contract/src/api.yaml` and the generated clients, if the field is API-visible,
- both sides' transformers.

See the `api-endpoint` skill for that flow.

## Gotchas

- **`MIGRATIONS_DIR` defaults to `migrations`**, but the files live in
  `data/mysql/migrations`. Run `make` targets from `apps/api` with `MIGRATIONS_DIR` set, or pass
  `-path apps/api/data/mysql/migrations` explicitly (what CI does).
- **Migrations are embedded (`embed.FS` in `apps/api/data/mysql/migrations/embed.go`) but
  nothing runs them at boot.** `main.go` never calls the migrator — the `migrate` CLI is the
  only path that applies a migration, in dev or in CI.
- **Installing `golang-migrate` needs `-tags mysql`**, and `go install pkg@version` refuses to
  run inside this repo's `go.work` workspace. Install it from outside the workspace with the
  workspace switched off:
  ```sh
  cd "$(mktemp -d)" && GOWORK=off go install -tags mysql github.com/golang-migrate/migrate/v4/cmd/migrate@v4.18.3
  ```
- A migration with no matching, correctly-reversing `down.sql` will pass review by inspection
  but breaks the first `migrate-down` anyone runs against it.

## Verify

```sh
make migrate-up && make migrate-down && make migrate-up
```

against a local database, then `npx nx run api:test`.
