# Furniture Bot PoC

PoC для первого контакта салона корпусной мебели: одна веб-страница с чатом ИИ-ассистента и кнопкой получения профайла клиента.

## Локальный запуск

1. Заполнить `OPENAI_API_KEY` в `.env`.
2. Поднять Postgres:

```bash
docker compose up -d postgres
```

3. Установить зависимости:

```bash
cd backend && npm install
cd ../frontend && npm install
```

4. Запустить backend и frontend:

```bash
cd backend && npm run start:dev
cd ../frontend && npm run dev
```

## Docker Compose

```bash
docker compose up --build
```

Frontend будет доступен на `http://localhost:5173`, backend на `http://localhost:8080`.

Клиентский чат: `http://localhost:5173/`

Открытая PoC-админка: `http://localhost:5173/admin`
