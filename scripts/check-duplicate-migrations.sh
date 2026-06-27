#!/usr/bin/env bash
# DB-01: falha o CI se duas migrações tiverem conteúdo idêntico byte-a-byte.
# Migrações duplicadas viram fonte de drift silencioso: alguém edita uma,
# a outra continua desatualizada, e o histórico para de refletir o banco.
set -euo pipefail

MIGRATIONS_DIR="supabase/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "No migrations directory found at $MIGRATIONS_DIR — nothing to check."
  exit 0
fi

cd "$MIGRATIONS_DIR"
shopt -s nullglob
files=( *.sql )
if [ ${#files[@]} -eq 0 ]; then
  echo "No .sql migrations found — nothing to check."
  exit 0
fi

dupes=$(md5sum *.sql | awk '{print $1}' | sort | uniq -d || true)
if [ -n "$dupes" ]; then
  echo "ERROR: migrations with duplicate content detected:" >&2
  echo "$dupes" | while read -r h; do
    md5sum *.sql | grep "^$h" >&2
  done
  exit 1
fi

echo "OK — no duplicate migrations."
