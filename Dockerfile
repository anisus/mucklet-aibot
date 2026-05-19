FROM node:26-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev \
	&& npm cache clean --force

COPY index.js ./
COPY src ./src
COPY mucklet.config.js ./

RUN mkdir -p /app/memory \
	&& chown -R node:node /app

USER node

VOLUME ["/app/memory"]

ENTRYPOINT ["node", "/app/index.js"]
