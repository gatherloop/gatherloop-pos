FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN apk add openjdk21-jre go

RUN npm install
RUN npx nx run api:build

FROM golang
COPY --from=build /app/dist/apps/api /go/bin/api
ENTRYPOINT ["/go/bin/api"]