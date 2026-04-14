FROM node:20-alpine

WORKDIR /app

COPY api/package*.json ./
RUN npm install --include=dev

COPY api/prisma ./prisma/
RUN npx prisma generate

COPY api/ .
RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
