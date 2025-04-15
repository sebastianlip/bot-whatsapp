# Configuración de Amazon Cognito y DynamoDB para WhatsApp Dashboard

Esta guía te ayudará a configurar los servicios de AWS necesarios para implementar la autenticación con Cognito y la gestión de relaciones usuario-teléfono con DynamoDB.

## Requisitos previos

- Una cuenta de AWS
- AWS CLI instalado y configurado
- Node.js y npm
- Angular CLI

## Paso 1: Configurar Amazon Cognito

### Crear un User Pool

1. Accede a la consola de AWS y busca el servicio "Cognito"
2. Haz clic en "Create user pool"
3. Configura las opciones de inicio de sesión:
   - Selecciona "Email"
   - Marca "Allow users to sign in with a username"
   - Marca "Allow users to sign in with a preferred username"

4. Configura los requisitos de seguridad de la contraseña:
   - Longitud mínima: 8 caracteres
   - Requiere al menos: 1 número, 1 carácter especial, 1 mayúscula, 1 minúscula

5. Configura la autenticación multi-factor (MFA) como opcional u obligatoria según tus necesidades

6. Configura la verificación de email:
   - Selecciona "Send email with Cognito"

7. Personaliza los mensajes de verificación según tus necesidades

8. Configura la personalización de la aplicación:
   - Nombre del pool: `WhatsAppUserPool`
   - Correo de origen: Tu correo electrónico

9. Integración con la aplicación:
   - Selecciona "Use the Cognito Hosted UI"
   - Nombre del cliente de la app: `WhatsAppClient`
   - Callback URLs: `http://localhost:4207/callback`
   - Sign-out URLs: `http://localhost:4207/login`
   - Selecciona los OAuth scopes: "email", "openid", "profile"

10. Revisa y crea el User Pool

### Crear usuarios de prueba

1. Una vez creado el User Pool, ve a la sección "Users" y haz clic en "Create user"
2. Crea usuarios con los mismos nombres que en la implementación mock:
   - admin (con correo: admin@example.com)
   - usuario1 (con correo: usuario1@example.com)
   - usuario2 (con correo: usuario2@example.com)
   - usuario3 (con correo: usuario3@example.com)
3. Asigna contraseñas temporales y marca "Send an invitation to this new user" para enviar correos de confirmación

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

## Paso 5: Actualizar el archivo de entorno de Angular

Edita el archivo `frontend/whatsapp-dashboard/src/environments/environment.ts` para incluir los IDs y URLs correctos:

```typescript
export const environment = {
  production: false,
  apiUrl: 'https://tu-api-gateway-id.execute-api.us-east-2.amazonaws.com/v1',
  cognito: {
    userPoolId: 'us-east-2_XXXXXXXX',  // Reemplaza con tu User Pool ID
    clientId: 'XXXXXXXXXXXXXXXXX',      // Reemplaza con tu App Client ID
    region: 'us-east-2'
  }
};
```

## Paso 6: Ejecutar la aplicación

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
ng serve --port 4207
```

4. Abre tu navegador en http://localhost:4207

## Solución de problemas

### CORS
Si experimentas errores de CORS, asegúrate de haber configurado correctamente CORS en API Gateway. Verifica que todos los orígenes, headers y métodos necesarios estén permitidos.

### Autenticación
Si tienes problemas con la autenticación:
1. Verifica que los IDs de User Pool y Client ID sean correctos
2. Comprueba que los usuarios hayan confirmado sus cuentas
3. Asegúrate de que las contraseñas cumplan con los requisitos

### DynamoDB
Si los números de teléfono no se recuperan correctamente:
1. Verifica que la tabla exista y tenga el nombre correcto
2. Comprueba los permisos de la función Lambda
3. Revisa los logs de la función Lambda en CloudWatch

### Depuración
Para depurar problemas, revisa:
1. Consola del navegador para errores del frontend
2. CloudWatch Logs para errores en Lambda
3. Registros de API Gateway 