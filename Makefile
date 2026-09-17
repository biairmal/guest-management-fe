.PHONY: install check lint build dev

install: ## Install dependencies from bun.lock
	bun install --frozen-lockfile

check: install lint build ## CI gate: install (fresh worktrees have no node_modules), lint, type-check + production build

lint:
	bun run lint

build:
	bun run build

dev:
	bun run dev
