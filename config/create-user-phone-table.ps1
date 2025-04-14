# Script para crear la tabla de asociaciones usuario-teléfono y cargar datos de prueba

# 1. Crear la tabla en DynamoDB
Write-Host "Creando tabla user-phone-associations..." -ForegroundColor Green
aws dynamodb create-table `
    --table-name user-phone-associations `
    --attribute-definitions `
        AttributeName=username,AttributeType=S `
        AttributeName=phoneNumber,AttributeType=S `
    --key-schema `
        AttributeName=username,KeyType=HASH `
        AttributeName=phoneNumber,KeyType=RANGE `
    --billing-mode PAY_PER_REQUEST

# Esperar a que la tabla esté activa
Write-Host "Esperando a que la tabla esté activa..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 2. Cargar datos de prueba
Write-Host "Cargando datos de prueba..." -ForegroundColor Green

# Para usuario1 (con 2 números asociados)
Write-Host "Agregando asociaciones para usuario1..." -ForegroundColor Cyan
aws dynamodb put-item `
    --table-name user-phone-associations `
    --item '{
        "username": {"S": "usuario1"},
        "phoneNumber": {"S": "+5491122334455"},
        "contactName": {"S": "Contacto Personal"}
    }'

aws dynamodb put-item `
    --table-name user-phone-associations `
    --item '{
        "username": {"S": "usuario1"},
        "phoneNumber": {"S": "+5493512347050"},
        "contactName": {"S": "Contacto Trabajo"}
    }'

# Para usuario2 (con 2 números asociados)
Write-Host "Agregando asociaciones para usuario2..." -ForegroundColor Cyan
aws dynamodb put-item `
    --table-name user-phone-associations `
    --item '{
        "username": {"S": "usuario2"},
        "phoneNumber": {"S": "+5491133445566"},
        "contactName": {"S": "Contacto 1"}
    }'

aws dynamodb put-item `
    --table-name user-phone-associations `
    --item '{
        "username": {"S": "usuario2"},
        "phoneNumber": {"S": "+5493512347051"},
        "contactName": {"S": "Contacto 2"}
    }'

# Para usuario3 (con 1 número asociado)
Write-Host "Agregando asociaciones para usuario3..." -ForegroundColor Cyan
aws dynamodb put-item `
    --table-name user-phone-associations `
    --item '{
        "username": {"S": "usuario3"},
        "phoneNumber": {"S": "+5491144556677"},
        "contactName": {"S": "Contacto Único"}
    }'

# 3. Verificar datos
Write-Host "Verificando datos cargados..." -ForegroundColor Green
aws dynamodb scan --table-name user-phone-associations

Write-Host "Configuración completada!" -ForegroundColor Green 