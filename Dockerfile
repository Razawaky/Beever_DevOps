FROM node:22-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY src ./src

RUN npm run css:build

FROM node:22-slim AS runtime

ENV NODE_ENV=production

ENV PORT=3000

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/src ./src

COPY migrations ./migrations
COPY scripts ./scripts

USER node

EXPOSE 3000

CMD ["node", "src/server.js"]
