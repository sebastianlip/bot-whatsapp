# Configuración del Bot de WhatsApp con API Gateway y Lambda

## Resumen de la Configuración

Este documento describe la configuración completa realizada para integrar el frontend Angular con los servicios de AWS (API Gateway, Lambda, DynamoDB y S3).

## 1. Configuración de API Gateway

### Detalles de la API
- **API ID**: 0wf1nv2l1k
- **Nombre**: WhatsApp-Bot-API
- **URL Base**: https://0wf1nv2l1k.execute-api.us-east-2.amazonaws.com/v1
- **Formato**: Swagger/OpenAPI 2.0

### Endpoints Configurados
- **GET /files**: Obtiene todos los archivos
- **POST /files**: Obtiene archivos con filtrado avanzado
- **POST /files/filter**: Filtra archivos por número de teléfono
- **GET /download**: Genera URLs de descarga firmadas para archivos específicos

### Archivo de Configuración
La configuración de API Gateway se encuentra en `backend/lambda/apigateway-config.json` y define:
- Rutas y métodos
- Integración con Lambda
- Configuración CORS
- Respuestas y códigos HTTP

## 2. Función Lambda

### Detalles de la Función
- **Nombre**: getUserFiles
- **Runtime**: Node.js
- **ARN**: arn:aws:lambda:us-east-2:338391041987:function:getUserFiles
- **Rol IAM**: WhatsAppLambdaRole

### Permisos configurados
- AWSLambdaBasicExecutionRole
- AmazonDynamoDBReadOnlyAccess
- AmazonS3ReadOnlyAccess

### Comandos Utilizados
```bash
# Añadir permisos a la función Lambda para DynamoDB
aws iam attach-role-policy --role-name WhatsAppLambdaRole --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBReadOnlyAccess

# Añadir permisos a la función Lambda para S3
aws iam attach-role-policy --role-name WhatsAppLambdaRole --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

# Permitir a API Gateway invocar la función Lambda
aws lambda add-permission --function-name getUserFiles --statement-id apigateway-invoke --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn "arn:aws:execute-api:us-east-2:338391041987:0wf1nv2l1k/*/*"
```

## 3. Configuración DynamoDB

### Tabla para Mensajes de WhatsApp
- **Nombre**: whatsapp-messages
- **Clave de partición**: id (String)

### Estructura de Datos
```json
{
  "id": {"S": "test-1"},
  "username": {"S": "admin"},
  "phoneNumber": {"S": "+123456789"},
  "timestamp": {"S": "2025-04-12T12:00:00Z"},
  "s3Key": {"S": "image/1744412738989-temp-image.png"},
  "contactName": {"S": "Usuario Prueba"}
}
```

### Comandos para Agregar Datos de Prueba
```bash
aws dynamodb put-item --table-name whatsapp-messages --item '{\"id\": {\"S\": \"test-1\"}, \"username\": {\"S\": \"admin\"}, \"phoneNumber\": {\"S\": \"+123456789\"}, \"timestamp\": {\"S\": \"2025-04-12T12:00:00Z\"}, \"s3Key\": {\"S\": \"image/1744412738989-temp-image.png\"}, \"contactName\": {\"S\": \"Usuario Prueba\"}}'
```

### Tabla para Asociaciones Usuario-Teléfono
- **Nombre**: user-phone-associations
- **Clave de partición**: username (String)
- **Clave de ordenación**: phoneNumber (String)
- **ARN**: arn:aws:dynamodb:us-east-2:338391041987:table/user-phone-associations
- **Modo de capacidad**: Bajo demanda

### Datos existentes
La tabla contiene 5 registros distribuidos entre 3 usuarios diferentes:

| username | phoneNumber | contactName |
|----------|-------------|-------------|
| usuario1 | +5491122334455 | Contacto Personal |
| usuario1 | +5493512347050 | Contacto Trabajo |
| usuario2 | +5491133445566 | Contacto 1 |
| usuario2 | +5493512347051 | Contacto 2 |
| usuario3 | +5491144556677 | Contacto Único |

## 4. Configuración S3

### Bucket
- **Nombre**: whatsapp-bot-files
- **Región**: us-east-2

### Estructura de Archivos
- La ruta principal para archivos de imagen es `/image/`
- Ejemplo: `image/1744412738989-temp-image.png`

## 5. Configuración del Frontend Angular

### Servicio de Archivos
El servicio de archivos (`file.service.ts`) se configuró con:
- **TEST_MODE**: false (para usar los servicios de AWS)
- **API_URL**: https://0wf1nv2l1k.execute-api.us-east-2.amazonaws.com/v1

### Métodos Principales
- `getAllFiles()`: Obtiene todos los archivos del usuario
- `getFilesByPhoneNumber(phoneNumber)`: Filtra archivos por número
- `getDownloadUrl(key)`: Genera URLs de descarga

## 6. Amazon Cognito para Autenticación

### Configuración del User Pool
- **Nombre del User Pool**: WhatsAppUsers
- **ID del User Pool**: us-east-2_QX51TFH9O
- **ARN**: arn:aws:cognito-idp:us-east-2:338391041987:userpool/us-east-2_QX51TFH9O
- **Dominio de Cognito**: https://whatsapp-dashboard-testeando.auth.us-east-2.amazoncognito.com

### Configuración de la App Cliente
- **ID de Cliente**: (pendiente de verificar, este dato se encuentra en la consola de AWS)
- **Callback URL**: http://localhost:4208/dashboard
- **Sign-out URL**: http://localhost:4208/login

### Usuarios Configurados
Ya existe un usuario en el User Pool con las siguientes características:
- **ID de usuario (sub)**: 613bb5b0-50d1-70ed-5a51-9faba3fae5f3
- **Estado**: Habilitado, requiere cambio de contraseña forzado
- **MFA**: Desactivado

### Integración con la Aplicación
Para integrar Cognito con la aplicación Angular, se configuraron los siguientes parámetros en el archivo `environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'https://0wf1nv2l1k.execute-api.us-east-2.amazonaws.com/v1',
  cognito: {
    userPoolId: 'us-east-2_QX51TFH9O',
    clientId: '1gi3ffh237kmtejjt9cn132fk4',
    region: 'us-east-2',
    domain: 'whatsapp-dashboard-testeando.auth.us-east-2.amazoncognito.com',
    redirectUri: 'http://localhost:4208/dashboard',
    logoutUri: 'http://localhost:4208/login'
  }
};
```

## 7. Problemas Comunes y Soluciones

### Error: "Property 'subscribe' does not exist on type 'string'"
Este error ocurre cuando se intenta usar `getDownloadUrl()` como un Observable cuando en realidad devuelve una cadena (string).

**Solución:** No usar `.subscribe()` con este método; simplemente usar el valor de retorno directamente.

### Error: "Internal server error" en API Gateway
Este error puede ocurrir por problemas de permisos o de configuración.

**Solución:** 
1. Verificar que el rol de Lambda tenga los permisos adecuados para DynamoDB y S3
2. Comprobar si la función Lambda está correctamente configurada
3. Revisar los logs de CloudWatch para diagnóstico

### Error: Respuesta Vacía desde Lambda
Esto puede ocurrir si no hay datos en DynamoDB o si el usuario no tiene archivos.

**Solución:**
1. Agregar datos de prueba con el comando de DynamoDB proporcionado
2. Verificar que el username en la solicitud coincida con los datos en DynamoDB

### Error: El archivo no se descarga o está corrupto
Si al hacer clic en "Descargar" la URL se abre pero no se descarga el archivo o muestra una imagen corrupta, puede deberse a:
1. El archivo en S3 está dañado o es demasiado pequeño
2. La clave S3 en DynamoDB no corresponde a un archivo real
3. Problemas con la generación de la URL firmada

**Solución:**
1. Verificar que el archivo existe en S3:
   ```bash
   aws s3 ls s3://whatsapp-bot-files/image/1744412738989-temp-image.png
   ```
2. Intentar descargar el archivo directamente usando AWS CLI:
   ```bash
   aws s3 cp s3://whatsapp-bot-files/image/1744412738989-temp-image.png ./test-image.png
   ```
3. Subir un nuevo archivo de prueba a S3:
   ```bash
   aws s3 cp ./nueva-imagen.png s3://whatsapp-bot-files/image/nueva-imagen.png
   ```
4. Actualizar el registro en DynamoDB con la nueva clave S3:
   ```bash
   aws dynamodb update-item --table-name whatsapp-messages \
     --key '{"id": {"S": "test-1"}}' \
     --update-expression "SET s3Key = :newKey" \
     --expression-attribute-values '{":newKey": {"S": "image/nueva-imagen.png"}}'
   ```

### Error: Archivo no se sube correctamente al simulador
Cuando intentas subir un archivo en el simulador de WhatsApp y la consola muestra `Failed to load resource: net::ERR_NAME_NOT_RESOLVED`, esto indica problemas con el API Gateway o la función Lambda.

**Solución:**
1. Activar el modo de prueba para verificar la funcionalidad sin dependencia de AWS:
   ```typescript
   // En upload.service.ts y file.service.ts
   private readonly TEST_MODE = true; // Activar temporalmente
   ```
2. Verificar la configuración del API Gateway para asegurarte de que el endpoint `/upload` esté correctamente configurado
3. Comprobar que la función Lambda `uploadFile` esté desplegada y tenga los permisos necesarios
4. Revisar los logs de CloudWatch para detectar errores específicos
5. Asegurarte de que la función Lambda tenga permisos para escribir en S3 y DynamoDB

### Error: Observable anidado al subir archivos
Errores relacionados con Observable anidado (`Observable<Observable<any>>`) o valores no utilizables pueden ocurrir en la implementación del servicio de carga.

**Solución:**
1. Usar el operador `switchMap` en lugar de `map` para transformar correctamente el Observable:
   ```typescript
   return this.readFileAsBase64(file).pipe(
     switchMap(fileContent => {
       // ... crear payload ...
       return this.http.post<any>(...);
     }),
     // ... manejo de respuesta ...
   );
   ```

### Error: "Amplify has not been configured correctly"
Este error aparece cuando la biblioteca de AWS Amplify no está correctamente configurada o inicializada.

**Solución:**
1. Verificar que la inicialización de Amplify se realiza antes de que cualquier servicio intente utilizarla:
   ```typescript
   // En app.module.ts o main.ts
   import { Amplify } from 'aws-amplify';
   
   Amplify.configure({
     Auth: {
       region: environment.cognito.region,
       userPoolId: environment.cognito.userPoolId,
       userPoolWebClientId: environment.cognito.clientId,
       oauth: {
         domain: environment.cognito.domain,
         scope: ['email', 'profile', 'openid'],
         redirectSignIn: environment.cognito.redirectUri,
         redirectSignOut: environment.cognito.logoutUri,
         responseType: 'code'
       }
     }
   });
   ```
2. Asegurarse de que las versiones de los paquetes de Amplify sean compatibles entre sí.
3. Verificar que la configuración utiliza exactamente los nombres de propiedades esperados por Amplify.

### Error: "localStorage is not defined"
Este error ocurre durante el renderizado en el servidor (SSR) porque localStorage no está disponible en entornos de servidor.

**Solución:**
1. Condicionar el uso de localStorage para que solo se ejecute en el navegador:
   ```typescript
   if (typeof window !== 'undefined') {
     localStorage.setItem('key', 'value');
   }
   ```
2. O utilizar un servicio especializado para abstraer el almacenamiento que maneje tanto el servidor como el cliente.

## 9. Modo de Prueba para Desarrollo

Para facilitar el desarrollo y depuración, el proyecto incluye un modo de prueba que funciona sin necesidad de AWS.

### Activar el Modo de Prueba

1. En `upload.service.ts` y `file.service.ts`, establece:
   ```typescript
   private readonly TEST_MODE = true;
   ```

### Cómo Funciona

- **Archivos Simulados**: Los archivos "subidos" se almacenan en localStorage bajo la clave 'simulatedFiles'
- **API Simulada**: No hay llamadas reales a API Gateway o Lambda
- **Persistencia**: Los archivos simulados persisten entre recargas de página
- **URLs de Descarga**: Se usan imágenes de marcador de posición (placeholders)

### Depuración de Datos del Modo de Prueba

Para ver los datos simulados guardados:
```javascript
// En la consola del navegador
JSON.parse(localStorage.getItem('simulatedFiles'));
```

Para limpiar los datos simulados:
```javascript
// En la consola del navegador
localStorage.removeItem('simulatedFiles');
```

## 10. Pruebas y Verificación

Para realizar una prueba completa del sistema:

1. **Subir archivo con el simulador**:
   - Usar el número `+123456789` para asociar con el usuario de prueba "admin"
   - Seleccionar un archivo para enviar (preferiblemente una imagen pequeña)
   - Verificar que aparece en la lista de "Archivos Enviados"

2. **Verificar la lista de archivos**:
   - Ir a la sección "Archivos" para ver el archivo recién subido
   - Comprobar que muestra la información correcta (nombre, contacto, etc.)

3. **Verificar descarga**:
   - Hacer clic en "Descargar" para verificar la URL generada
   - En modo de prueba, se mostrará una imagen de marcador de posición

4. **Verificar filtrado**:
   - Probar la búsqueda por número de teléfono
   - Confirmar que solo muestra archivos del número especificado

## 8. Comandos Útiles para Depuración

### API Gateway
```bash
# Listar APIs
aws apigateway get-rest-apis

# Obtener información detallada de la API
aws apigateway get-rest-api --rest-api-id 0wf1nv2l1k

# Crear un nuevo despliegue
aws apigateway create-deployment --rest-api-id 0wf1nv2l1k --stage-name v1
```

### Lambda
```bash
# Verificar configuración de la función
aws lambda get-function --function-name getUserFiles

# Obtener política de la función
aws lambda get-policy --function-name getUserFiles

# Invocar función manualmente
aws lambda invoke --function-name getUserFiles --payload "{\"body\": \"{\\\"username\\\": \\\"admin\\\"}\"}" response.json
```

### DynamoDB
```bash
# Listar tablas
aws dynamodb list-tables

# Escanear tabla (primeros 10 elementos)
aws dynamodb scan --table-name whatsapp-messages --limit 10

# Consultar asociaciones de un usuario específico
aws dynamodb query --table-name user-phone-associations --key-condition-expression "username = :username" --expression-attribute-values '{":username": {"S": "usuario1"}}'
```

### S3
```bash
# Listar contenido del bucket
aws s3 ls s3://whatsapp-bot-files

# Listar archivos en directorio específico
aws s3 ls s3://whatsapp-bot-files/image/
```

### Cognito
```bash
# Listar grupos de usuarios
aws cognito-idp list-user-pools --max-results 10

# Listar usuarios de un User Pool
aws cognito-idp list-users --user-pool-id us-east-2_QX51TFH9O

# Verificar estado de un usuario específico
aws cognito-idp admin-get-user --user-pool-id us-east-2_QX51TFH9O --username [nombre_de_usuario]
```

## 11. Próximos Pasos Sugeridos

1. **Completar la Integración de Cognito**:
   - Implementar manejo del estado "Forzar cambio de contraseña"
   - Configurar el componente de inicio de sesión para usar Cognito
   - Implementar el guardián de rutas para proteger las páginas privadas

2. **Mejorar la Gestión de Asociaciones Usuario-Teléfono**:
   - Crear una interfaz para que los administradores puedan añadir/eliminar asociaciones
   - Implementar una función Lambda para administrar estos cambios

3. **Mejorar el Manejo de Errores**:
   - Implementar un sistema de reintentos en el frontend
   - Mostrar mensajes de error más detallados

4. **Mejorar la Seguridad**:
   - Implementar roles y permisos basados en grupos de Cognito
   - Restringir acceso a archivos por usuario

5. **Optimización**:
   - Implementar caché para respuestas frecuentes
   - Optimizar consultas a DynamoDB con índices

6. **Funcionalidades Adicionales**:
   - Subida de archivos directamente desde el dashboard
   - Previsualización de archivos (imágenes, documentos PDF, etc.)
   - Búsqueda avanzada por fechas y tipos de archivo 