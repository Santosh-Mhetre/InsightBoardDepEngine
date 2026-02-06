FROM node:20-alpine
WORKDIR /app

# install deps
COPY package.json package-lock.json* ./
RUN npm ci --production

# copy source
COPY . .

# build
RUN npm run build

EXPOSE 4000
CMD ["node", "dist/server.js"]

