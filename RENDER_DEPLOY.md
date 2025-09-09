# 🚀 Despliegue en Render - Casa Benetti API

## Variables de Entorno Requeridas en Render

Configura estas variables en el panel de Render (Environment Variables):

### 🔧 **Variables de Base de Datos**
```
DB_HOST=dpg-d3090u7diees73era8mg-a
DB_PORT=5432
DB_DATABASE=casa_benetti_cy9b
DB_USER=wtcdb
DB_PASSWORD=7qnDgDeX4ZfacOSehO0vRzyfXePNfxn2
DB_CONNECTOR=postgresql
DB_URL=postgresql://wtcdb:7qnDgDeX4ZfacOSehO0vRzyfXePNfxn2@dpg-d3090u7diees73era8mg-a/casa_benetti_cy9b
```

### 🔑 **Configuración JWT**
```
TOKEN_SECRET=casa-benetti-secret-key-2024-production-render
TOKEN_EXPIRES_IN=36000
```

### 🌐 **Configuración CORS**
```
FRONTEND_URL=https://benetti-casa-ui.vercel.app
```

### 📁 **Configuración de Archivos**
```
FILE_STORAGE_DIRECTORY=./.sandbox
```

### ⚡ **Configuración del Servidor**
```
PORT=10000
HOST=0.0.0.0
NODE_ENV=production
```

## 📋 **Configuración en Render**

### 1. **Configuración del Servicio**
- **Build Command**: `npm run build`
- **Start Command**: `npm run start:render`
- **Node Version**: `18.x` o superior

### 2. **Variables de Entorno**
Copia todas las variables de arriba en el panel de Environment Variables de Render.

### 3. **Auto-Deploy**
- Conecta tu repositorio GitHub
- Habilita auto-deploy desde la rama `main`

## 🎯 **Usuario Administrador**
El sistema creará automáticamente un usuario administrador:
- **Email**: `pruebas@whathecode.com`
- **Password**: `Guao2023.-**`

## 🔗 **URLs una vez desplegado**
- **API Base**: `https://tu-app-name.onrender.com`
- **API Explorer**: `https://tu-app-name.onrender.com/explorer`
- **Health Check**: `https://tu-app-name.onrender.com/ping`

## 📚 **Endpoints Principales**
- `POST /auth/login` - Autenticación
- `GET /ping` - Health check
- `GET /explorer` - Documentación Swagger

¡Listo para producción! 🚀
