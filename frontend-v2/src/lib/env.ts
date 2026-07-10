// Рантайм-конфиг для SSR-кода.
// import.meta.env запекается Vite на этапе сборки — в docker-образе его нет,
// поэтому сначала смотрим process.env (задаётся docker-compose'ом в рантайме).
export const API_BASE =
  process.env.API_URL || import.meta.env.API_URL || 'http://localhost:5001'

export const SITE_URL =
  process.env.SITE_URL || import.meta.env.SITE_URL || 'https://makita-remont.ru'
