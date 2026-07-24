FROM node:20-slim AS build

WORKDIR /app

# Build context — корень репозитория (docker build -f frontend/Dockerfile .)
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY frontend/ ./
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
