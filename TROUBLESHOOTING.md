# Troubleshooting

## Installation

Use Node.js 24 (`node --version`) and `npm ci`. If npm cannot write its cache, free space on the affected drive or set `NPM_CONFIG_CACHE` to a writable location in your shell. Do not commit machine-specific npm settings.

## Port already in use

Use `npm run dev -- --port 3010` and open http://127.0.0.1:3010. Avoid stopping unrelated processes. Point browser checks at that address using `BASE_URL` as described in [testing](docs/TESTING.md).

## Local assistant instead of AI

This is expected when `AI_MODE=mock`, the selected provider lacks a key, or a live request fails. Configure the provider in ignored `.env.local` and restart the server. A configured key is not proof of a successful AI response. The interface distinguishes local, live and fallback responses. Never paste a key into an issue.

## Run simulation is disabled

Resolve any clarification, select a valid change and confirm it. Editing the site or power delta revokes earlier approval. A permitted delta is an integer from −6 to +6 dB and must keep the site's resulting power within 30–46 dBm.

## Browser checks cannot launch Chromium

Run `npx playwright install chromium`. On Linux, use `npx playwright install --with-deps chromium`. Start the app before running `npm run test:ui`. Reports and screenshots are written to ignored `artifacts/`.

## Build cannot download fonts

`next/font/google` downloads the configured fonts during a clean build. Allow access to Google's font endpoints and retry. Once assets are built or cached, the local mock workflow makes no AI-provider requests. A fresh dependency installation and clean font build are not fully offline operations.

## Branch protection cannot be enabled

Private branch rules require a supported GitHub plan. The repository remains private; no script upgrades billing or changes visibility. See [repository governance](docs/REPOSITORY.md).
