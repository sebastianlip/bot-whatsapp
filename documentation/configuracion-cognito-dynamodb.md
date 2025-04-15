# Configuración de Amazon Cognito y DynamoDB para WhatsApp Dashboard

Esta guía te ayudará a configurar los servicios de AWS necesarios para implementar la autenticación con Cognito y la gestión de relaciones usuario-teléfono con DynamoDB.

## Requisitos previos

- Una cuenta de AWS
- AWS CLI instalado y configurado
- Node.js y npm
- Angular CLI

## Paso 1: Configurar Amazon Cognito

### Ajustar configuración del App Client

Ahora que ya tienes tu User Pool (`us-east-2_QX51TFH9O`) y App Client (`1gi3ffh237kmtejjt9cn132fk4`), debes actualizar la configuración de las URL de redirección:

1. Accede a la consola de AWS y busca "Cognito"
2. Selecciona tu User Pool "WhatsAppUsers"
3. Ve a la pestaña "App integration" (Integración de aplicaciones)
4. En la sección "App clients and analytics" selecciona tu cliente "WhatsAppDashboard"
5. Haz clic en "Edit" (Editar)
6. En la sección "Hosted UI", configura las siguientes URLs de devolución de llamada:
   - Callback URL: `http://localhost:4208/dashboard`
   - Sign-out URL: `http://localhost:4208/login`
7. En la sección "Allowed OAuth flows", asegúrate de que estén seleccionados:
   - Authorization code grant
   - Implicit grant
8. En la sección "OpenID Connect scopes", verifica que estén seleccionados:
   - OpenID
   - Email
   - Profile
9. Guarda los cambios

### Configurar el dominio del User Pool

Para que la autenticación funcione correctamente, debes configurar un dominio para el User Pool:

1. En tu User Pool, ve a la pestaña "App integration"
2. En la sección "Domain", haz clic en "Actions" y selecciona "Create custom domain" o "Create Cognito domain"
3. Si usas un dominio de Cognito:
   - Elige un prefijo para el dominio (por ejemplo, `whatsapp-dashboard`)
   - El dominio completo sería `https://whatsapp-dashboard.auth.us-east-2.amazoncognito.com`
4. Guarda los cambios

### Actualizar el archivo de entorno de la aplicación

Una vez que hayas configurado el dominio, debes actualizar el archivo de entorno de la aplicación:

```typescript
// frontend/whatsapp-dashboard/src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'https://0wf1nv2l1k.execute-api.us-east-2.amazonaws.com/v1',
  cognito: {
    userPoolId: 'us-east-2_QX51TFH9O',
    clientId: '1gi3ffh237kmtejjt9cn132fk4',
    region: 'us-east-2',
    domain: 'whatsapp-dashboard.auth.us-east-2.amazoncognito.com', // Reemplaza con tu dominio
    redirectUri: 'http://localhost:4208/dashboard',
    logoutUri: 'http://localhost:4208/login'
  }
};
```

## Paso 2: Configurar DynamoDB

### Crear la tabla de relaciones usuario-teléfono

1. Accede a la consola de AWS y busca el servicio "DynamoDB"
2. Haz clic en "Create table"
3. Configura la tabla:
   - Nombre de la tabla: `user-phone-association`
   - Clave primaria: `username` (String)
   - Desmarca "Use default settings" para configurar opciones avanzadas (opcional)
   - Ajusta las unidades de capacidad de lectura/escritura según tus necesidades (para desarrollo, las opciones mínimas son suficientes)
4. Haz clic en "Create"

### Añadir datos iniciales

Para facilitar las pruebas, puedes añadir algunos datos iniciales:

1. Ve a la tabla creada y haz clic en "Create item"
2. Añade los siguientes elementos:

```json
{
  "username": "usuario1",
  "phoneNumbers": ["+5491122334455", "+5493512347050"]
}
```

```json
{
  "username": "usuario2",
  "phoneNumbers": ["+5491133445566", "+5493512347051"]
}
```

```json
{
  "username": "usuario3",
  "phoneNumbers": ["+5491144556677"]
}
```

## Paso 3: Configurar la función Lambda para gestionar relaciones

1. Accede a la consola de AWS y busca el servicio "Lambda"
2. Haz clic en "Create function"
3. Configura la función:
   - Nombre: `userPhoneAssociation`
   - Runtime: Node.js 18.x
   - Arquitectura: x86_64
   - Permisos: Crea un nuevo rol con permisos básicos de ejecución Lambda

4. Después de crear la función, añade permisos para DynamoDB:
   - Ve a la pestaña "Configuration"
   - Haz clic en "Permissions"
   - Haz clic en el nombre del rol
   - En la nueva pestaña, haz clic en "Add permissions" y "Attach policies"
   - Busca y selecciona "AmazonDynamoDBFullAccess" (para desarrollo) o crea una política más restrictiva para producción

5. Sube el código de la función Lambda:
   - Guarda el archivo `userPhoneAssociation.js` que creamos anteriormente
   - Comprímelo en un archivo zip
   - En la pestaña "Code" de la función Lambda, selecciona "Upload from .zip file"
   - Sube el archivo zip

6. Configura variables de entorno:
   - Añade `USER_PHONES_TABLE` con el valor `user-phone-association`
   - Añade `AWS_REGION` con tu región de AWS (por ejemplo, `us-east-2`)

## Paso 4: Configurar API Gateway

1. Accede a la consola de AWS y busca el servicio "API Gateway"
2. Haz clic en "Create API"
3. Selecciona "REST API" y haz clic en "Build"
4. Configura la API:
   - Nombre: `WhatsAppDashboardAPI`
   - Descripción: `API para gestionar relaciones usuario-teléfono`
   - Tipo de endpoint: Regional

5. Crea recursos y métodos:
   - Crea un recurso `/user-phones` con método POST
   - Crea un recurso `/associate-phone` con método POST
   - Crea un recurso `/disassociate-phone` con método POST

6. Configura cada método para que invoque tu función Lambda:
   - Tipo de integración: Lambda Function
   - Función Lambda: userPhoneAssociation
   - Usa Lambda Proxy integration

7. Configura CORS para cada método:
   - Habilita CORS en cada recurso
   - Asegúrate de permitir los headers necesarios y los métodos HTTP

8. Implementa la API:
   - Haz clic en "Deploy API"
   - Crea una nueva etapa llamada "v1"
   - Anota la URL de invocación de la API

## Paso 5: Ejecutar la aplicación

1. Navega a la carpeta del proyecto Angular:
```bash
cd frontend/whatsapp-dashboard
```

2. Instala las dependencias:
```bash
npm install
```

3. Inicia el servidor de desarrollo:
```bash
ng serve --port 4208
```

4. Abre tu navegador en http://localhost:4208

## Solución de problemas

### CORS
Si experimentas errores de CORS, asegúrate de haber configurado correctamente CORS en API Gateway. Verifica que todos los orígenes, headers y métodos necesarios estén permitidos.

### Autenticación
Si tienes problemas con la autenticación:
1. Verifica que las URLs de redirección (Callback y Sign-out) estén correctamente configuradas en la consola de Cognito
2. Comprueba que hayas configurado el dominio del User Pool y lo hayas actualizado en el archivo de entorno
3. Asegúrate de que los usuarios existan en el User Pool y hayan confirmado sus cuentas
4. Verifica en la consola del navegador si hay errores relacionados con la autenticación

### DynamoDB
Si los números de teléfono no se recuperan correctamente:
1. Verifica que la tabla exista y tenga el nombre correcto
2. Comprueba los permisos de la función Lambda
3. Revisa los logs de la función Lambda en CloudWatch 