# Use the official Node.js image as the base image
FROM node:18

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Set the environment variable to run the application in production mode
ENV DEBUG=*,-express:*

# Expose the port your app runs on (3000 in this case)
EXPOSE 3001

# Define the command to run your application
CMD ["node", "server.js"]
