FROM node:20-slim

WORKDIR /app

COPY package.json pnpm-lock.yaml* .npmrc* pnpm-workspace.yaml* ./
RUN npm install -g pnpm && \
    pnpm config set minimum-release-age 0 && \
    pnpm config set fetch-retries 5 && \
    pnpm config set fetch-retry-maxtimeout 180000 && \
    pnpm config set fetch-timeout 180000 && \
    pnpm config set network-concurrency 3 && \
    pnpm install --no-frozen-lockfile

COPY . .

EXPOSE 5173

CMD ["pnpm", "dev", "--host", "0.0.0.0"]
