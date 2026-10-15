.PHONY: install migrate migration-check run lint format test check schema verify

PYTHON := .venv/bin/python
RUFF := .venv/bin/ruff
PYTEST := .venv/bin/pytest

install:
	python3 -m venv .venv
	.venv/bin/python -m pip install --upgrade pip
	.venv/bin/python -m pip install -e ".[dev]"

migrate:
	$(PYTHON) manage.py migrate

migration-check:
	$(PYTHON) manage.py makemigrations --check --dry-run

run:
	$(PYTHON) manage.py runserver

lint:
	$(RUFF) check .
	$(RUFF) format --check .

format:
	$(RUFF) check --fix .
	$(RUFF) format .

test:
	$(PYTEST)

check:
	$(PYTHON) manage.py check

schema:
	$(PYTHON) manage.py spectacular --validate --file /tmp/utility-in-life-openapi.yaml

verify: lint test check migration-check schema
