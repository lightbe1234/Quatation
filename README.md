# Quotation Management System

Full-stack workspace for the quotation management application.

## Requirements

- Node.js 24 or newer
- npm 11 or newer

## Setup

```powershell
npm.cmd install
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
npm.cmd run dev
```

The frontend runs at `http://localhost:5173` and the Express API runs at
`http://localhost:3000`. The API health endpoint is `GET /api/health`.

## Commands

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run lint
npm.cmd test
```
