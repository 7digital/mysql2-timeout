SHELL := bash
.ONESHELL:
.SILENT:
.SHELLFLAGS := -euo pipefail -c

define docker-compose-run
	docker-compose run --rm $(1) && exit_status=$$? || exit_status=$$?
	[ "$$exit_status" -ne 0 ] && docker-compose ps && docker-compose logs
	docker-compose down --volumes
	(exit $$exit_status)
endef

export HOST_UID = $(shell id -u)

test:
	$(call docker-compose-run, test)
.PHONY: test

watch:
	$(call docker-compose-run, watch)
.PHONY: watch
