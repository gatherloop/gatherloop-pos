FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN apk add openjdk21-jre go

RUN npm install
RUN npx nx run api:build

FROM scratch
WORKDIR /app
RUN ls
COPY --from=build apps/api/dist/api ./
CMD ["./api"]