FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
# Keep dev deps: prisma + tsx are needed for `prisma migrate deploy` and the
# tsx-based seed script at runtime.
RUN npm ci

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3001

# migrate + seed + start is orchestrated from docker-compose `command`.
CMD ["npm", "start"]
