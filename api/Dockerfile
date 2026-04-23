FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY api/package*.json ./
RUN npm install --include=dev

COPY api/prisma ./prisma/
RUN npx prisma generate

COPY api/ .
RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
