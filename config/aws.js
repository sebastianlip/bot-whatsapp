/**
 * Configuración de AWS para el bot de WhatsApp
 */
const { S3Client } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

// Configuración de la región de AWS
const REGION = process.env.AWS_REGION || 'us-east-1';

// Crear cliente de S3
const s3Client = new S3Client({ 
    region: REGION,
    // Las credenciales se tomarán automáticamente del perfil de CLI configurado
    // o de las variables de entorno AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY
});

// Crear cliente base de DynamoDB
const ddbClient = new DynamoDBClient({ region: REGION });

// Crear cliente de documento de DynamoDB para operaciones más intuitivas
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

// Nombres de recursos de AWS
const AWS_CONFIG = {
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || 'whatsapp-bot-files',
    DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME || 'whatsapp-messages'
};

module.exports = {
    s3Client,
    ddbClient,
    ddbDocClient,
    AWS_CONFIG
}; 