FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN apk add openjdk21-jre go

RUN npm install
RUN npx nx run api:build

FROM golang:1.22
COPY --from=build /app/apps/api/dist/api /api
CMD ["/api"]