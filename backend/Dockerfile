# Optional: containerised backend. Local dev (Poetry + uvicorn) is the
# recommended path — see README.md. This image installs only public PyPI
# dependencies, so no private registry credentials are needed.
FROM python:3.12-slim

ENV PATH="/root/.local/bin:${PATH}"
RUN apt-get update \
    && apt-get install -y --no-install-recommends pipx curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/* \
    && pipx install poetry

WORKDIR /app
COPY . /app

RUN poetry install --no-root --only main

EXPOSE 8000
HEALTHCHECK CMD curl --fail http://localhost:8000/health || exit 1

CMD ["poetry", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
