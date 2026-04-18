# Stage 1: Build the React application
FROM node:20-slim AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all project files
COPY . .

# Build arguments for Supabase and Google Services
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_GEMINI_API_KEY
ARG VITE_GA_MEASUREMENT_ID
ARG VITE_GOOGLE_MAPS_API_KEY

# Set them as environment variables for the build process
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
ENV VITE_GA_MEASUREMENT_ID=$VITE_GA_MEASUREMENT_ID
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

# Build the project
RUN npm run build

# Stage 2: Serve the application with Express
FROM node:20-slim

WORKDIR /app

# Copy package and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy the server file
COPY server.js ./

# Copy the build output from the build stage
COPY --from=build /app/dist ./dist

# Expose port 8080 (default for Cloud Run)
EXPOSE 8080

# Start Express server
CMD ["node", "server.js"]
