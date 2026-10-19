FROM node:22-slim

WORKDIR /app

# Copy package manifests first for layer caching
COPY package.json ./

# Install dependencies (including tsx and build tools)
RUN npm install

# Copy application source, server, and static assets
COPY . .

# Build the production Vite frontend bundle into /app/dist
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start the full-stack Express + PostgreSQL + Vite static server
CMD ["npm", "start"]
