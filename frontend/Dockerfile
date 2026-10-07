FROM node:20-slim

WORKDIR /app

COPY package.json pnpm-lock.yaml* .npmrc* ./
RUN npm install -g pnpm && pnpm install --no-frozen-lockfile

COPY . .

EXPOSE 5173

CMD ["pnpm", "dev", "--host", "0.0.0.0"]
