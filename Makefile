.PHONY: install check lint test build dev

install: ## Install dependencies from bun.lock
	bun install --frozen-lockfile

check: install lint test build ## CI gate: install (fresh worktrees have no node_modules), lint, unit tests, type-check + production build

lint:
	bun run lint

test:
	bun test

build:
	bun run build

dev:
	bun run dev
