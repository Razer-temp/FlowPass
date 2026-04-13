# Stage 1: Build the React application
FROM node:20-slim AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all project files
COPY . .

# Build the project
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:stable-alpine

# Copy the custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the build output from the build stage to the nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 8080 (default for Cloud Run)
EXPOSE 8080

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
