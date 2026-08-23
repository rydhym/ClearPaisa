# Base Node Image
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# Runner Image
FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 5000

ENV NODE_ENV=production

CMD ["sh", "-c", "npx prisma db push && npx prisma db seed && node dist/server.js"]
