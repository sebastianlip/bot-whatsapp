# Bot de WhatsApp con Dashboard

Sistema para gestionar archivos compartidos a través de WhatsApp, con una interfaz de administración web desarrollada en Angular.

## Estructura del Proyecto

- **frontend/**: Aplicación Angular para la gestión de archivos
  - **whatsapp-dashboard/**: Dashboard administrativo
  
- **backend/**: Servicios de backend y función Lambda
  - **lambda/**: Funciones Lambda para AWS
    - **uploadFile.js**: Función para subir archivos a S3
    - **getUserFiles.js**: Función para obtener archivos de S3
    - **apigateway-config.json**: Configuración de API Gateway

- **config/**: Archivos de configuración para AWS

- **documentation/**: Documentación del proyecto
  - **whatsapp-bot-configuracion.md**: Guía completa de configuración

## Requisitos

- Node.js 14.x o superior
- Angular CLI
- Cuenta de AWS con servicios:
  - Lambda
  - API Gateway
  - S3
  - DynamoDB

## Instalación

1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/whatsapp-bot.git
cd whatsapp-bot
```

2. Instalar dependencias generales
```bash
npm install
```

3. Instalar dependencias del frontend
```bash
cd frontend/whatsapp-dashboard
npm install
```

4. Configurar AWS (ver documentación/whatsapp-bot-configuracion.md)

## Ejecución

### Dashboard Angular
```bash
cd frontend/whatsapp-dashboard
ng serve
```

El dashboard estará disponible en http://localhost:4200/

### Desplegar funciones Lambda

Sigue los pasos en la documentación para desplegar las funciones Lambda en AWS.

## Uso del Dashboard

El dashboard permite:
- Ver archivos recibidos por WhatsApp
- Filtrar archivos por número de teléfono
- Descargar archivos
- Simular el envío de archivos a través de WhatsApp

## Configuración de AWS

Ver el archivo de documentación para detalles completos sobre la configuración de AWS.

## Licencia

Este proyecto está bajo la Licencia MIT. 