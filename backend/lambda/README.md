# Funciones Lambda para el Bot de WhatsApp

Este directorio contiene las funciones Lambda necesarias para la integración del dashboard Angular con los servicios de AWS.

## Estructura

- **uploadFile.js**: Función para subir archivos a S3 y registrar metadatos en DynamoDB
- **getUserFiles.js**: Función para obtener archivos de S3 y sus metadatos de DynamoDB
- **apigateway-config.json**: Configuración de API Gateway para exponer las funciones como REST API

## Requisitos

- Node.js 14.x o superior
- AWS CLI configurado
- Cuenta de AWS con permisos para:
  - Lambda
  - API Gateway
  - S3
  - DynamoDB
  - IAM

## Despliegue

### Preparar paquete para uploadFile

```bash
# Crear directorio para el paquete
mkdir -p lambda-uploadfile-package
cp uploadFile.js lambda-uploadfile-package/
cd lambda-uploadfile-package

# Inicializar proyecto npm
npm init -y

# Instalar dependencias
npm install aws-sdk uuid

# Crear archivo ZIP para Lambda
zip -r uploadFile.zip uploadFile.js node_modules/ package.json
```

### Desplegar función uploadFile

```bash
aws lambda update-function-code --function-name uploadFile --zip-file fileb://uploadFile.zip
```

### Preparar paquete para getUserFiles

```bash
# Crear directorio para el paquete
mkdir -p lambda-getfiles-package
cp getUserFiles.js lambda-getfiles-package/
cd lambda-getfiles-package

# Inicializar proyecto npm
npm init -y

# Instalar dependencias
npm install aws-sdk

# Crear archivo ZIP para Lambda
zip -r getUserFiles.zip getUserFiles.js node_modules/ package.json
```

### Desplegar función getUserFiles

```bash
aws lambda update-function-code --function-name getUserFiles --zip-file fileb://getUserFiles.zip
```

### Desplegar configuración de API Gateway

```bash
aws apigateway put-rest-api --rest-api-id 0wf1nv2l1k --mode overwrite --body file://apigateway-config.json
aws apigateway create-deployment --rest-api-id 0wf1nv2l1k --stage-name v1
```

## Configuración de Permisos

Asegúrate de que la función Lambda tenga los permisos necesarios:

```bash
# Añadir permisos para DynamoDB
aws iam attach-role-policy --role-name WhatsAppLambdaRole --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

# Añadir permisos para S3
aws iam attach-role-policy --role-name WhatsAppLambdaRole --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Permitir a API Gateway invocar la función Lambda
aws lambda add-permission --function-name uploadFile --statement-id apigateway-invoke-upload --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn "arn:aws:execute-api:us-east-2:338391041987:0wf1nv2l1k/*/*"

aws lambda add-permission --function-name getUserFiles --statement-id apigateway-invoke-getfiles --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn "arn:aws:execute-api:us-east-2:338391041987:0wf1nv2l1k/*/*"
```

## Pruebas

Para probar las funciones, puedes usar el script de prueba incluido:

```bash
cd test
node test-api.js
```

Esto comprobará que las funciones Lambda están respondiendo correctamente a través de API Gateway. 