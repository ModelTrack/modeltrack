# Contributing to ModelTrack

Thanks for your interest in contributing to ModelTrack! This guide will help you get started.

## Development Setup

```bash
git clone https://github.com/ModelTrack/modeltrack.git
cd modeltrack

# Proxy (Go 1.22+)
cd proxy && go run .

# API (Node 20+)
cd api && npm install && npm run dev

# Dashboard (Node 20+)
cd dashboard && npm install && npm run dev
```

The proxy runs on `:8080`, the API on `:3001`, and the dashboard on `:5173`.

## Project Structure

```
proxy/        Go LLM proxy (Anthropic, OpenAI, Bedrock, Azure)
collector/    Go infrastructure cost collector
api/          TypeScript API server (Express + SQLite)
dashboard/    React dashboard (Vite + Tailwind + Recharts)
sdks/         Python and Node.js auto-instrumentation SDKs
site/         Marketing website (Next.js)
```

## Making Changes

1. Fork the repo and create a branch from `master`
2. Make your changes
3. Ensure everything compiles:
   ```bash
   cd proxy && go build ./...
   cd api && npx tsc --noEmit
   cd dashboard && npx tsc --noEmit
   ```
4. Run tests: `cd proxy && go test ./...`
5. Open a pull request

## What to Contribute

- Bug fixes
- New LLM provider adapters
- Dashboard improvements
- Documentation
- SDK improvements
- Test coverage

## Code Style

- **Go**: standard `gofmt` formatting
- **TypeScript**: strict mode, no `any` where avoidable
- **React**: functional components with hooks
- **CSS**: Tailwind utility classes

## Reporting Issues

Open an issue at [github.com/ModelTrack/modeltrack/issues](https://github.com/ModelTrack/modeltrack/issues) with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Your environment (OS, Go version, Node version)

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
