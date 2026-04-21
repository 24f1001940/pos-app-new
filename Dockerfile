FROM node:22-alpine
WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server .

ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "src/server.js"]
