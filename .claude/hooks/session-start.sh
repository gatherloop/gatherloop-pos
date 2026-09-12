#!/bin/bash
set -euo pipefail

# libs/api-contract/src/__generated__ is gitignored but go.work declares its
# Go module as a workspace member, so apps/api will not compile until these
# have run at least once (see CLAUDE.md, "Two traps that cost a whole
# session if missed").
npx nx run api-contract:generate:go
npx nx run api-contract:generate:ts
