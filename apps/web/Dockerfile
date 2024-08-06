FROM node:22-alpine AS build

ARG API_BASE_URL=http://188.166.250.3:8000

WORKDIR /app
COPY . .
RUN apk add openjdk21-jre go
RUN npm install
RUN NEXT_PUBLIC_API_BASE_URL=$API_BASE_URL npx nx run web:build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/apps/web/.next ./.next
COPY --from=build /app/node_modules ./node_modules
CMD ["npx", "next", "start"]