# Nutze ein Node.js-Image
FROM node:22-alpine

# Setze das Arbeitsverzeichnis im Container
WORKDIR /app

# Kopiere package.json und package-lock.json (wenn vorhanden)
COPY package*.json ./

# Installiere die Dependencies
RUN npm install -g nodemon

# Kopiere den Rest des Codes
COPY . .

# Öffne den Port, den dein Server verwendet (z. B. 5000)
EXPOSE 5000

# Starte den Server
CMD ["node", "server.js"]