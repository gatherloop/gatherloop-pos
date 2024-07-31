FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN apk add openjdk21-jre
RUN npm install
RUN npx nx run web:build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/apps/web/.next ./next
COPY --from=build /app/node_modules ./node_modules
CMD ["npx", "next", "start"]