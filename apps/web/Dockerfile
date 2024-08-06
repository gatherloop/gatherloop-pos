FROM node:22-alpine AS build

ARG API_BASE_URL
RUN echo "The ARG variable value is $API_BASE_URL"
ENV NEXT_PUBLIC_API_BASE_URL=$API_BASE_URL

WORKDIR /app
COPY . .
RUN apk add openjdk21-jre go
RUN npm install
RUN npx nx run web:build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/apps/web/.next ./.next
COPY --from=build /app/node_modules ./node_modules
CMD ["npx", "next", "start"]