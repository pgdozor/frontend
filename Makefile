# The vite 8 toolchain needs Node 24 (see .node-version). Override for a plain
# environment where the right Node is already active: `make check NPM=npm`.
NPM ?= fnm exec --using=v24.16.0 npm

.PHONY: check
check:
	$(NPM) run check

.PHONY: build
build:
	$(NPM) run build

# Usage: `make release VERSION=0.1.0`.
# Validates -> tags -> pushes -> fires .github/workflows/release.yml -> builds and publishes a multi-arch image to GHCR.
.PHONY: release
release:
	@echo "$(VERSION)" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$$' \
		|| { echo "error: pass a semantic version, e.g. make release VERSION=0.1.0"; exit 1; }
	@git diff --quiet && git diff --cached --quiet \
		|| { echo "error: uncommitted changes — commit them before releasing"; exit 1; }
	@if git rev-parse -q --verify "refs/tags/v$(VERSION)" >/dev/null; then \
		echo "error: tag v$(VERSION) already exists"; exit 1; fi
	$(MAKE) check
	git tag -a "v$(VERSION)" -m "v$(VERSION)"
	git push origin "v$(VERSION)"
	@echo "Tagged and pushed v$(VERSION). GitHub Actions is building and publishing the image."
