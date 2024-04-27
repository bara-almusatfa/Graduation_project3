# Use an official Node.js runtime as a base image
FROM ubuntu:22.04
ARG DEBIAN_FRONTEND=noninteractive
# Install any dependencies required for your Express app
RUN  apt-get update && \
    apt-get install -y \
    nodejs \
    npm \
    nmap \
    whois \
    dirsearch

# Set the working directory in the container
WORKDIR /app

# Copy the rest of your application code
COPY . .

# Install app dependencies
RUN npm install -g nodemon
RUN npm install

# Expose the port your app will run on
EXPOSE 3001

# Define the command to run your application
CMD ["nodemon", "index.js"]
