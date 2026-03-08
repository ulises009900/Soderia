# Use official Node LTS image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source files
COPY . .

# Application port (Render will supply PORT automatically)
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
