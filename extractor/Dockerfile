FROM node:22-bookworm-slim AS node
FROM python:3.12-slim-bookworm
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1     PUPPETEER_SKIP_DOWNLOAD=true PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium     MPLCONFIGDIR=/tmp/matplotlib
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm     && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx     && apt-get update && apt-get install -y --no-install-recommends chromium fontconfig fonts-liberation ca-certificates     && rm -rf /var/lib/apt/lists/*     && npm install --global @mermaid-js/mermaid-cli@11.12.0     && groupadd --gid 10001 prism && useradd --uid 10001 --gid prism --create-home prism
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=prism:prism app ./app
COPY --chown=prism:prism scripts ./scripts
COPY --chown=prism:prism tests ./tests
COPY --chown=prism:prism prism_bridge.py ./
RUN mkdir -p generated_diagrams logs && chown -R prism:prism /app
USER prism
ENTRYPOINT ["python", "scripts/container_entrypoint.py"]
CMD ["python", "prism_bridge.py"]
