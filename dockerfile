#docker build -t mrml-web-app .^

FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build


FROM nginx:1.27-alpine

# Default backend API endpoint (HTTP)
ENV VITE_API_BASE_URL=http://host.docker.internal:8089

# Copy nginx template so the default nginx entrypoint can render it via envsubst
COPY nginx.conf /etc/nginx/templates/default.conf.template

# copy build
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8097

CMD ["nginx", "-g", "daemon off;"]