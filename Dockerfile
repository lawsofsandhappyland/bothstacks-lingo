# BothLingo — single Cloud Run container: Node server serving the built
# frontend (dist/) and the /api Gemini endpoints. Build dist/ first: npm run build.
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY dist ./dist

# Cloud Run provides PORT (8080); server reads process.env.PORT.
CMD ["node", "server/index.mjs"]
