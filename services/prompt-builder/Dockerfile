FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY src/ ./src/

USER node

EXPOSE 3001

HEALTHCHECK CMD wget -qO- http://localhost:3001/api/v1/health || exit 1

CMD ["node", "src/index.js"]
