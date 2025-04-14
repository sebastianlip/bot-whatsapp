# Guía de Implementación de AWS para WhatsApp Dashboard

Esta guía te ayudará a configurar la infraestructura AWS necesaria para que tu aplicación Angular se conecte con los servicios de Amazon y pueda acceder a los archivos almacenados en S3 utilizando DynamoDB para las relaciones entre usuarios y archivos.

## Arquitectura

La arquitectura consiste en:

1. **Amazon Cognito**: Para la autenticación de usuarios
2. **Amazon API Gateway**: Expone endpoints para la comunicación con tu aplicación
3. **AWS Lambda**: Procesa las solicitudes y accede a DynamoDB y S3
4. **Amazon DynamoDB**: Almacena la información de mensajes y archivos
5. **Amazon S3**: Almacena los archivos físicamente

## Requisitos previos

- Una cuenta de AWS
- AWS CLI instalado y configurado
- Node.js y npm
- Conocimientos básicos de AWS

## Paso 1: Preparar archivos para la función Lambda

1. Navega a la carpeta del proyecto donde está el archivo `getUserFiles.js`:

```bash
cd backend/lambda
```

2. Crea un package.json e instala las dependencias necesarias:

```bash
npm init -y
npm install aws-sdk
```

3. Crea un archivo ZIP con el código y sus dependencias:

```bash
zip -r getUserFiles.zip getUserFiles.js node_modules
```

## Paso 2: Crear la función Lambda

Puedes crear la función Lambda desde la consola AWS o usando AWS CLI:

### Usando AWS CLI:

1. Primero, crea un rol IAM con los permisos necesarios:

```bash
aws iam create-role --role-name WhatsAppLambdaRole --assume-role-policy-document file://lambda-trust-policy.json
```

Contenido de `lambda-trust-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

2. Añade las políticas necesarias al rol:

```bash
aws iam attach-role-policy --role-name WhatsAppLambdaRole --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBReadOnlyAccess
aws iam attach-role-policy --role-name WhatsAppLambdaRole --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
aws iam attach-role-policy --role-name WhatsAppLambdaRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

3. Crea la función Lambda:

```bash
aws lambda create-function \
  --function-name getUserFiles \
  --runtime nodejs16.x \
  --handler getUserFiles.handler \
  --role arn:aws:iam::CUENTA_AWS:role/WhatsAppLambdaRole \
  --zip-file fileb://getUserFiles.zip \
  --timeout 30 \
  --memory-size 256
```

Reemplaza `CUENTA_AWS` con tu ID de cuenta de AWS.

## Paso 3: Configurar Amazon API Gateway

### Usando AWS CLI:

1. Crea una API REST:

```bash
aws apigateway create-rest-api --name "WhatsApp-Bot-API"
```

Anota el `id` de la API que se te proporcionará en la respuesta.

2. Obtén el ID del recurso raíz:

```bash
aws apigateway get-resources --rest-api-id API_ID
```

Reemplaza `API_ID` con el ID de la API que obtuviste en el paso anterior.

3. Crea los recursos y métodos usando el archivo de configuración:

Edita el archivo `apigateway-config.json` y reemplaza `YOUR_ACCOUNT_ID` con tu ID de cuenta AWS y `API_ID` con el ID de la API que obtuviste.

4. Importa la configuración:

```bash
aws apigateway import-rest-api --body file://apigateway-config.json
```

5. Despliega la API:

```bash
aws apigateway create-deployment --rest-api-id API_ID --stage-name prod
```

6. Anota la URL de invocación de tu API:

```
https://API_ID.execute-api.us-east-2.amazonaws.com/prod
```

## Paso 4: Configurar Amazon Cognito (opcional)

Si también quieres usar autenticación con Cognito:

1. Crea un User Pool:

```bash
aws cognito-idp create-user-pool --pool-name WhatsAppUserPool
```

2. Crea un User Pool Client:

```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id USER_POOL_ID \
  --client-name WhatsAppAppClient \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH
```

Reemplaza `USER_POOL_ID` con el ID del User Pool que creaste.

## Paso 5: Actualizar la configuración en el frontend

Edita el archivo `frontend/whatsapp-dashboard/src/app/core/services/file.service.ts`:

1. Cambia el modo de prueba a `false`:

```typescript
private readonly TEST_MODE = false;
```

2. Actualiza la URL de la API:

```typescript
private readonly API_URL = 'https://TU_API_ID.execute-api.us-east-2.amazonaws.com/prod';
```

## Paso 6: Verificar permisos

Asegúrate de que:

1. La función Lambda tenga permisos para:
   - Leer desde DynamoDB
   - Generar URLs presignadas para S3

2. API Gateway tenga permisos para invocar la función Lambda

3. Tu tabla de DynamoDB tenga el formato correcto:
   - Debe contener un atributo `username` para filtrar por usuario
   - Los archivos deben tener un atributo `s3Key` que apunte a la ubicación en S3

## Paso 7: Probar la integración

1. Ejecuta tu aplicación Angular:

```bash
cd frontend/whatsapp-dashboard
ng serve
```

2. Inicia sesión con un usuario válido

3. Verifica que puedas ver los archivos reales en la tabla

## Solución de problemas

### No se ven archivos

Verifica:

1. **Logs de Lambda**: Revisa los logs en CloudWatch para ver si hay errores
   ```bash
   aws logs filter-log-events --log-group-name /aws/lambda/getUserFiles
   ```

2. **CORS**: Asegúrate de que CORS esté correctamente configurado en API Gateway
   - Todas las solicitudes deben tener los encabezados CORS adecuados

3. **Datos en DynamoDB**: Confirma que hay datos en DynamoDB para el usuario con el que iniciaste sesión
   ```bash
   aws dynamodb scan --table-name whatsapp-messages --filter-expression "username = :u" --expression-attribute-values '{":u":{"S":"NOMBRE_USUARIO"}}'
   ```

4. **Conexión a Internet**: Asegúrate de que tu aplicación puede conectarse a Internet

### Errores comunes

1. **Error 403 (Forbidden)**: Problemas de permisos en la función Lambda o API Gateway
2. **Error 500 (Internal Server Error)**: Error en la ejecución de la función Lambda
3. **Error CORS**: Configuración incorrecta de CORS en API Gateway

## Desactivar temporalmente el modo AWS

Si necesitas volver al modo de datos simulados, simplemente cambia `TEST_MODE` a `true` en el archivo `file.service.ts`. 