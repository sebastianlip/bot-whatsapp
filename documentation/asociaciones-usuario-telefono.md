# Configuración de Asociaciones Usuario-Teléfono

Para implementar la relación entre usuarios y números de teléfono, se debe crear una nueva tabla en DynamoDB y cargar los datos de prueba.

## 1. Crear tabla en DynamoDB

Ejecute el siguiente comando para crear la tabla de asociaciones:

```bash
aws dynamodb create-table \
    --table-name user-phone-associations \
    --attribute-definitions \
        AttributeName=username,AttributeType=S \
        AttributeName=phoneNumber,AttributeType=S \
    --key-schema \
        AttributeName=username,KeyType=HASH \
        AttributeName=phoneNumber,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST
```

## 2. Crear datos de prueba

Después de crear la tabla, cargue algunos datos de prueba con los siguientes comandos:

### Para usuario1 (con 2 números asociados)

```bash
aws dynamodb put-item \
    --table-name user-phone-associations \
    --item '{
        "username": {"S": "usuario1"},
        "phoneNumber": {"S": "+5491122334455"},
        "contactName": {"S": "Contacto Personal"}
    }'

aws dynamodb put-item \
    --table-name user-phone-associations \
    --item '{
        "username": {"S": "usuario1"},
        "phoneNumber": {"S": "+5493512347050"},
        "contactName": {"S": "Contacto Trabajo"}
    }'
```

### Para usuario2 (con 2 números asociados)

```bash
aws dynamodb put-item \
    --table-name user-phone-associations \
    --item '{
        "username": {"S": "usuario2"},
        "phoneNumber": {"S": "+5491133445566"},
        "contactName": {"S": "Contacto 1"}
    }'

aws dynamodb put-item \
    --table-name user-phone-associations \
    --item '{
        "username": {"S": "usuario2"},
        "phoneNumber": {"S": "+5493512347051"},
        "contactName": {"S": "Contacto 2"}
    }'
```

### Para usuario3 (con 1 número asociado)

```bash
aws dynamodb put-item \
    --table-name user-phone-associations \
    --item '{
        "username": {"S": "usuario3"},
        "phoneNumber": {"S": "+5491144556677"},
        "contactName": {"S": "Contacto Único"}
    }'
```

## 3. Verificar datos

Para verificar que los datos se hayan cargado correctamente, ejecute:

```bash
aws dynamodb scan --table-name user-phone-associations
```

## Configuración de Prueba

Para probar la funcionalidad:

1. Inicie sesión con el usuario "admin" (contraseña: Password123!)
   - Debería ver todos los archivos de todos los números.

2. Inicie sesión con "usuario1" (contraseña: Password123!)
   - Solo debería ver archivos de los números +5491122334455 y +5493512347050

3. Inicie sesión con "usuario2" (contraseña: Password123!)
   - Solo debería ver archivos de los números +5491133445566 y +5493512347051

4. Inicie sesión con "usuario3" (contraseña: Password123!)
   - Solo debería ver archivos del número +5491144556677

## Notas Importantes

1. El usuario "admin" tiene acceso a todos los archivos, independientemente del número de teléfono.
2. Los usuarios normales solo pueden ver archivos de los números que tienen asociados.
3. Si envía un archivo desde el simulador de WhatsApp, asegúrese de usar uno de los números asociados al usuario con el que desea probarlo. 