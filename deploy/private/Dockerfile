FROM node:22-bookworm-slim
WORKDIR /app
COPY --chown=root:root package.json ./
COPY --chown=root:root server ./server
COPY --chown=root:root app ./app
COPY --chown=root:root dist/index.html dist/styles.css dist/app.js ./dist/
USER 10001:10001
CMD ["node", "server/private.mjs"]
