FROM node:20-slim

WORKDIR /app

ENV CI=true

COPY package.json pnpm-lock.yaml* .npmrc* ./
RUN npm install -g pnpm && pnpm config set minimum-release-age 0 && pnpm install

COPY . .

EXPOSE 5173

CMD ["pnpm", "dev", "--host", "0.0.0.0"]
