FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
RUN apk add --no-cache python3 make g++ curl
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY src/server/ src/server/
COPY --from=build /app/dist/ dist/
RUN mkdir -p /app/data
ENV PORT=3001
ENV DB_PATH=/app/data/vitritrack.db
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:3001/api/vitrines || exit 1
CMD ["npx", "tsx", "src/server/index.ts"]
