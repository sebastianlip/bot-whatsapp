# WhatsApp Dashboard

Dashboard administrativo para gestionar archivos compartidos a través de WhatsApp, desarrollado con Angular.

## Características

- Visualización de archivos compartidos por WhatsApp
- Filtrado por número de teléfono
- Descarga de archivos
- Simulador de WhatsApp para pruebas

## Requisitos

- Node.js 14.x o superior
- Angular CLI 16.x o superior
- API Gateway y Lambda configurados en AWS

## Instalación

```bash
# Instalar dependencias
npm install

# Iniciar el servidor de desarrollo
ng serve
```

La aplicación estará disponible en http://localhost:4200/

## Estructura del Proyecto

```
src/
├── app/
│   ├── auth/                 # Componentes de autenticación
│   ├── components/           # Componentes reutilizables
│   ├── core/                 # Servicios y utilidades
│   │   ├── services/
│   │   │   ├── auth.service.ts      # Servicio de autenticación
│   │   │   ├── file.service.ts      # Servicio para gestión de archivos
│   │   │   └── upload.service.ts    # Servicio para subir archivos
│   ├── dashboard/            # Componentes del dashboard
│   ├── shared/               # Módulos compartidos
│   └── whatsapp-simulator/   # Simulador de WhatsApp
└── environments/             # Configuración de entornos
```

## Configuración

### API Gateway

La aplicación se conecta a AWS a través de API Gateway. Para configurar la URL de la API:

1. Abrir el archivo `src/app/core/services/file.service.ts`
2. Actualizar la variable `API_URL` con la URL de tu API Gateway:

```typescript
private readonly API_URL = 'https://tu-api-id.execute-api.us-east-2.amazonaws.com/v1';
```

### Modo de Prueba

La aplicación incluye un modo de prueba que funciona sin necesidad de conexión a AWS:

1. Abrir los archivos `src/app/core/services/file.service.ts` y `src/app/core/services/upload.service.ts`
2. Configurar las variables:

```typescript
private readonly TEST_MODE = true; // Habilitar modo de prueba
private readonly CORS_AUTO_FALLBACK = true; // Habilitar fallback automático
```

## Compilación para Producción

```bash
ng build --prod
```

Los archivos compilados estarán disponibles en el directorio `dist/`.

## Depuración

La aplicación muestra información detallada en la consola del navegador, útil para identificar problemas de conexión con AWS.

## Desarrollo

### Agregar Nuevos Componentes

```bash
ng generate component components/nombre-componente
```

### Agregar Nuevos Servicios

```bash
ng generate service core/services/nombre-servicio
```

## Licencia

Este proyecto está bajo la Licencia MIT.
