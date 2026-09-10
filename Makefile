.PHONY: help setup dev build package publish publish-rc publish-dry clean lint test-e2e test-e2e-ui test-e2e-headed test-e2e-install kill-port image-build image-run image-stop image-clean

# Per-developer overrides (container runner, image name, port). Optional: the
# leading `-` means it's fine if the file is absent. Defaults below apply when a
# value isn't set, so `image-*` works out of the box. Copy or edit .makefile.env
# to switch the runner (e.g. DOCKER_RUNNER = docker).
-include .makefile.env
DOCKER_RUNNER  ?= podman
IMAGE_NAME     ?= registry.km8.es/web-multiselect-examples:prod
CONTAINER_NAME ?= web-multiselect-examples
IMAGE_PORT     ?= 12210

help: ## Show this help message
	@echo "Available targets:"
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'

setup: ## Install dependencies and prepare project
	@echo "Installing dependencies..."
	npm install
	@echo "Setup complete"

dev: ## Start development server with hot reload
	@echo "Starting development server..."
	@rm -rf node_modules/.vite
	npm run dev

# Free the vite dev-server ports. Vite starts at 12200 and hops to the next free
# port when one is busy, so a stale run can hold any of 12200-12205. Kills whatever
# is LISTENING on those ports, covering both IPv4 and IPv6 (vite binds [::1] too).
# Same netstat/taskkill mechanism as svelte-fluentui, widened to the 12200-12205 range.
# Recipes here default to Git Bash (sh), so the recipe is written in sh and calls the
# Windows netstat/taskkill directly rather than switching this target's SHELL to cmd.exe
# (a target-specific SHELL leaks and breaks the grep/awk-based help target).
kill-port: ## Free the vite dev-server ports (12200-12205)
	@echo "Freeing ports 12200-12205..."
ifeq ($(OS),Windows_NT)
	-@netstat -ano | grep -E ':1220[0-5][^0-9]' | grep LISTENING | awk '{print $$5}' | sort -u | while read pid; do MSYS_NO_PATHCONV=1 taskkill /F /PID $$pid; done
else
	-@for p in 12200 12201 12202 12203 12204 12205; do lsof -ti tcp:$$p | xargs -r kill -9; done
endif
	@echo "Ports 12200-12205 are free"

build: ## Build for production
	@echo "Building for production..."
	npm run build
	@echo "Build complete - Files in ./dist"

package: build ## Create npm package (tarball)
	@echo "Creating package..."
	npm pack
	@echo "Package created - see above for details"

publish-dry: ## Publish to npm (dry run) - cleans dist first
	@echo "Running publish dry-run..."
	npm run clean:dist
	npm run build
	npm publish --dry-run
	@echo "Dry-run complete - Review the output above"

publish: ## Publish to npm as 'latest' - cleans dist first (use for release/patch/minor/major)
	@echo "WARNING: This will publish to npm registry as the 'latest' dist-tag"
	@echo "Use 'make publish-rc' instead if you're shipping a pre-release version."
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@powershell -Command "Read-Host | Out-Null"
	@echo "Publishing to npm..."
	npm run clean:dist
	npm run build
	npm publish
	@echo "Published successfully"

publish-rc: ## Publish to npm under the 'rc' dist-tag (does NOT touch 'latest')
	@echo "WARNING: This will publish to npm registry under the 'rc' dist-tag"
	@echo "The 'latest' tag will be untouched - consumers must opt in with @rc or @<version>."
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@powershell -Command "Read-Host | Out-Null"
	@echo "Publishing to npm under 'rc' tag..."
	npm run clean:dist
	npm run build
	npm publish --tag rc
	@echo "Published successfully under 'rc' tag"

clean: ## Clean build artifacts and node_modules
	@echo "Cleaning build artifacts..."
	npm run clean
	@echo "Clean complete"

clean-dist: ## Clean only dist folder
	@echo "Cleaning dist folder..."
	npm run clean:dist
	@echo "Dist cleaned"

preview: build ## Preview production build
	@echo "Starting preview server..."
	npm run preview

lint: ## Run linter (if configured)
	@echo "Linting is not configured yet"
	@echo "Consider adding ESLint in the future"

test-e2e: ## Run Playwright e2e tests (headless)
	npm run test:e2e

test-e2e-ui: ## Run Playwright e2e tests in UI mode
	npm run test:e2e:ui

test-e2e-headed: ## Run Playwright e2e tests headed (watch the browser)
	npm run test:e2e:headed

test-e2e-install: ## Install chromium browser binary (one-time)
	npm run test:e2e:install

check-version: ## Show current package version
	@echo "Current version:"
	@node -p "require('./package.json').version"

update-deps: ## Update dependencies
	@echo "Updating dependencies..."
	npm update
	@echo "Dependencies updated"

install-dev: ## Install as local dev dependency (for testing)
	@echo "Installing package locally..."
	npm pack
	@echo "You can now install this in another project with:"
	@echo "npm install <path-to-tgz-file>"

# ── Container image (examples site) ──────────────────────────────────────────
# Runner is configurable via .makefile.env (DOCKER_RUNNER); defaults to podman.

image-build: ## Build the examples container image (build + serve stages)
	@echo "Building $(IMAGE_NAME) with $(DOCKER_RUNNER)..."
	$(DOCKER_RUNNER) build -t $(IMAGE_NAME) .
	@echo "Image built: $(IMAGE_NAME)"

image-run: ## Run the examples image (serves on IMAGE_PORT, default 12210)
	@echo "Starting $(CONTAINER_NAME) on http://localhost:$(IMAGE_PORT) ..."
	-@$(DOCKER_RUNNER) rm -f $(CONTAINER_NAME) >/dev/null 2>&1
	$(DOCKER_RUNNER) run -d --name $(CONTAINER_NAME) -p $(IMAGE_PORT):80 $(IMAGE_NAME)
	@echo "Serving examples at http://localhost:$(IMAGE_PORT)"

image-stop: ## Stop and remove the examples container
	@echo "Stopping $(CONTAINER_NAME)..."
	-@$(DOCKER_RUNNER) rm -f $(CONTAINER_NAME) >/dev/null 2>&1
	@echo "Stopped"

image-clean: image-stop ## Remove the examples container and image
	@echo "Removing image $(IMAGE_NAME)..."
	-@$(DOCKER_RUNNER) rmi $(IMAGE_NAME) >/dev/null 2>&1
	@echo "Image removed"

# Default target
.DEFAULT_GOAL := help
