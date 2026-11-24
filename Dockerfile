# --- Build del client -------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci

COPY client client
RUN npm run build

# --- Immagine finale: solo Express + client compilato -----------------------
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=5677

COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci --omit=dev --workspace server && npm cache clean --force

COPY server/src server/src
COPY --from=build /app/client/dist client/dist

USER node
EXPOSE 5677

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["node", "server/src/index.js"]
