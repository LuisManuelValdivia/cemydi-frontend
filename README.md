# CEMYDI Frontend

Frontend built with Next.js 16 + React 19.

## Setup

```bash
npm install
```

## Environment variables

1. Copy `.env.local.example` to `.env.local`.
2. Set the backend URL in `NEXT_PUBLIC_API_URL`.

```bash
# local backend
NEXT_PUBLIC_API_URL="http://localhost:4000"

# deployed backend
NEXT_PUBLIC_API_URL="https://your-api-domain.com"
```

## Run

```bash
# development
npm run dev

# production build
npm run build
npm run start
```
