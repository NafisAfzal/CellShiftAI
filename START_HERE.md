# Start here

CellShiftAI is an existing, runnable Next.js application. Start with [README.md](README.md) for setup and a product tour.

1. Use Node.js 24 and run `npm ci`.
2. Run `npm run dev` and open http://127.0.0.1:3000.
3. Try “Increase Cell B power by 3 dB”, interpret it, confirm, and run the simulation.
4. Compare the impact, generate a review and export the evidence.

The default local mode needs no key. Optional provider configuration belongs in `.env.local`; see [AI setup](docs/AI_PROVIDER_SETUP.md).

For development, read [CONTRIBUTING.md](CONTRIBUTING.md), [AGENTS.md](AGENTS.md), [the development workflow](PROMPT_ORDER.md), and [architecture](docs/ARCHITECTURE.md). The earlier workshop prompt pack is retained locally but is not required to run or maintain this application.

All sites, users and RF metrics are synthetic. Keep human confirmation, deterministic numerical evidence, and clear limitations intact.
