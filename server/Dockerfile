# Server Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

RUN if [ -f package-lock.json ]; then npm ci --omit=dev && npm cache clean --force; else npm install --omit=dev && npm cache clean --force; fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Install ALL dependencies (including dev dependencies) for building
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/
RUN if [ -f package-lock.json ]; then npm ci && npm cache clean --force; else npm install && npm cache clean --force; fi

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

USER nodejs

EXPOSE 4000

ENV PORT=4000

CMD ["npm", "start"]
