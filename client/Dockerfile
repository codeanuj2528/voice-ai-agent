
# Stage 1: Build the React application
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Set API URL based on build arg
ARG VITE_API_URL=http://localhost:8000/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Install a simple static server
RUN npm install -g serve

# Serve the build folder on port 80
EXPOSE 80
CMD ["serve", "-s", "dist", "-l", "80"]
