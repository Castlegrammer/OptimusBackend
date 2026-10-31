# ========================================================
# Dockerfile para Optimus360 API REST (Coolify / Docker)
# ========================================================
FROM node:22-alpine AS base

# Crear directorio de trabajo
WORKDIR /app

# Instalar herramientas requeridas si es necesario
RUN apk add --no-cache tzdata

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --omit=dev && npm cache clean --force

# Copiar código fuente y base de datos
COPY src ./src
COPY database ./database

# Cambiar a usuario no-root por seguridad
USER node

# Exponer el puerto del contenedor
EXPOSE 3000

# Comando de arranque para Coolify
CMD ["npm", "start"]
