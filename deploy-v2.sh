#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE="${COMPOSE:-docker-compose}"
SERVICES=(backend-v2 admin-frontend frontend-v2)
CONTAINERS=(my_backend_v2 my_admin_frontend my_frontend_v2)

cd "$ROOT_DIR"

if ! command -v "$COMPOSE" >/dev/null 2>&1; then
  echo "Не найдена команда $COMPOSE" >&2
  exit 1
fi

BRANCH="${DEPLOY_BRANCH:-$(git branch --show-current)}"
if [[ -z "$BRANCH" ]]; then
  echo "Не удалось определить текущую ветку" >&2
  exit 1
fi

if [[ "${1:-}" != "--after-pull" ]]; then
  if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
    echo "Есть незакоммиченные изменения в отслеживаемых файлах. Деплой остановлен." >&2
    git status --short
    exit 1
  fi

  echo "==> Обновление ветки $BRANCH"
  git fetch origin "$BRANCH"
  git merge --ff-only "origin/$BRANCH"

  # После обновления запускаем уже свежую версию этого скрипта.
  exec "$ROOT_DIR/deploy-v2.sh" --after-pull
fi

echo "==> Сборка: ${SERVICES[*]}"
"$COMPOSE" build "${SERVICES[@]}"

db_psql() {
  "$COMPOSE" exec -T db sh -c \
    'exec psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"' \
    sh "$@"
}

echo "==> Проверка журнала миграций"
printf '%s\n' \
  'CREATE TABLE IF NOT EXISTS app_schema_migrations (
     filename TEXT PRIMARY KEY,
     applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );' | db_psql >/dev/null

while IFS= read -r migration; do
  filename="${migration##*/}"
  prefix="${filename%%_*}"

  [[ "$prefix" =~ ^[0-9]+$ ]] || continue
  ((10#$prefix >= 4)) || continue

  applied="$(
    printf "SELECT COUNT(*) FROM app_schema_migrations WHERE filename = '%s';\n" "$filename" |
      db_psql -tA | tr -d '[:space:]'
  )"
  if [[ "$applied" == "1" ]]; then
    echo "    пропуск: $filename"
    continue
  fi

  echo "    применение: $filename"
  db_psql < "$migration"
  printf "INSERT INTO app_schema_migrations (filename) VALUES ('%s');\n" "$filename" |
    db_psql >/dev/null
done < <(
  find migrations/sql -maxdepth 1 -type f -name '*.sql' ! -name '*rollback*' |
    sort
)

echo "==> Пересоздание v2-контейнеров"
# Эти контейнеры stateless. Явное удаление обходит KeyError: ContainerConfig
# в установленном на сервере docker-compose 1.29.2. Volumes и БД не затрагиваются.
docker rm -f "${CONTAINERS[@]}" >/dev/null 2>&1 || true
"$COMPOSE" up -d --no-deps "${SERVICES[@]}"

wait_http() {
  local url="$1"
  local label="$2"
  local attempt

  for attempt in {1..30}; do
    if curl -fsS "$url" >/dev/null; then
      echo "    OK: $label"
      return 0
    fi
    sleep 2
  done

  echo "    ERROR: $label ($url)" >&2
  return 1
}

echo "==> Проверка сервисов"
health_failed=0
wait_http 'http://127.0.0.1:5002/health' 'API' || health_failed=1
wait_http 'http://127.0.0.1:4321/' 'сайт' || health_failed=1
wait_http 'http://127.0.0.1:8081/' 'админка' || health_failed=1

if ((health_failed)); then
  "$COMPOSE" ps
  "$COMPOSE" logs --tail=100 "${SERVICES[@]}"
  exit 1
fi

"$COMPOSE" ps
echo "==> Готово: $(git log -1 --oneline)"
