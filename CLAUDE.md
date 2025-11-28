# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlashBack USB is an Electron desktop application for USB drive inventory management. It uses Svelte 5 frontend with Tailwind CSS/DaisyUI, communicating with Electron main process via IPC for database operations (MySQL) and hardware interactions.

## Development Commands

```bash
npm run dev          # Start development (Vite dev server + Electron concurrently)
npm run build        # Build Vite frontend only
npm run package      # Full build for all platforms
npm run package:win  # Windows NSIS installer build
```

Windows batch helpers: `dev.bat` (dev mode), `build.bat` (production build)

No test or lint scripts are configured.

## Architecture

### IPC Communication Flow
1. Frontend calls `window.api.methodName()` (exposed via `electron/preload.cjs`)
2. Wrapper in `src/lib/api.js` provides clean interface
3. Electron main process (`electron/main.cjs`) handles via `ipcMain.handle()`
4. Services in `electron/services/` execute business logic
5. Results return via IPC to frontend

### Key Directories
- `src/lib/stores/` - Svelte 5 rune stores (session, navigation, theme, toast, filters)
- `src/lib/components/` - Reusable UI components (Layout, DataTable, Modal, FormFields/)
- `src/views/` - Full-page view components organized by feature
- `electron/services/` - Backend services (database.cjs, crudFactory.cjs, usbDetector.cjs, pdfGenerator.cjs)

### State Management
Uses Svelte 5 runes (`$state()`) for reactivity. Stores handle shared state with localStorage persistence for session/preferences.

### Database Pattern
- MySQL with connection pooling via mysql2
- `crudFactory.cjs` generates repetitive CRUD IPC handlers
- `eventLogger.cjs` provides audit trail logging
- Schema and stored procedures in `flashback_usb.sql`

### Core Entities
USB Drives, Technicians, Platforms, USB Types, Models, Versions, Event Logs

## Environment Setup

Copy `.env.example` to `.env` and configure:
```
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, APP_PASSWORD
```

## Key Files

- `electron/main.cjs` - Electron entry point, all IPC handlers registered here
- `src/lib/api.js` - Frontend API wrapper for all IPC calls
- `src/App.svelte` - Root component handling routing and auth
- `electron/services/crudFactory.cjs` - Factory pattern for CRUD operations
