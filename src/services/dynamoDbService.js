/**
 * Servicio para manejar operaciones con Amazon DynamoDB
 */
const { PutCommand, GetCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { ddbDocClient, AWS_CONFIG } = require('../../config/aws');

/**
 * Guarda información de un mensaje en DynamoDB
 * @param {Object} messageData - Datos del mensaje a guardar
 * @returns {Promise<Object>} - Datos guardados
 */
async function saveMessageData(messageData) {
    try {
        // Asegurarnos de que el objeto tenga un ID único
        if (!messageData.id) {
            messageData.id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        }
        
        // Añadir timestamp si no existe
        if (!messageData.timestamp) {
            messageData.timestamp = new Date().toISOString();
        }
        
        // Configurar el comando para guardar el registro
        const command = new PutCommand({
            TableName: AWS_CONFIG.DYNAMODB_TABLE_NAME,
            Item: messageData
        });
        
        // Ejecutar el comando
        await ddbDocClient.send(command);
        
        console.log(`Datos del mensaje guardados en DynamoDB con ID: ${messageData.id}`);
        return messageData;
    } catch (error) {
        console.error('Error al guardar datos en DynamoDB:', error);
        
        // Si la tabla no existe, intentar crearla
        if (error.name === 'ResourceNotFoundException') {
            console.log('La tabla no existe. Por favor, crea la tabla primero.');
        }
        
        throw error;
    }
}

/**
 * Obtiene mensajes por número de teléfono
 * @param {string} phoneNumber - Número de teléfono del remitente
 * @returns {Promise<Array>} - Lista de mensajes
 */
async function getMessagesByPhone(phoneNumber) {
    try {
        // Primero intentamos usar el índice secundario
        try {
            // Configurar el comando para consultar la tabla por índice
            const command = new QueryCommand({
                TableName: AWS_CONFIG.DYNAMODB_TABLE_NAME,
                IndexName: 'PhoneNumberIndex', // Asumiendo que tienes este índice secundario global
                KeyConditionExpression: 'phoneNumber = :phone',
                ExpressionAttributeValues: {
                    ':phone': phoneNumber
                },
                ScanIndexForward: false // Para ordenar por el más reciente primero
            });
            
            // Ejecutar el comando
            const result = await ddbDocClient.send(command);
            return result.Items || [];
        } catch (indexError) {
            // Si falla la consulta por índice (tal vez no existe el índice),
            // hacemos un scan con filtro (menos eficiente pero funcional)
            console.log("No se pudo usar el índice secundario, usando scan como alternativa");
            
            const command = new ScanCommand({
                TableName: AWS_CONFIG.DYNAMODB_TABLE_NAME,
                FilterExpression: 'phoneNumber = :phone',
                ExpressionAttributeValues: {
                    ':phone': phoneNumber
                }
            });
            
            const result = await ddbDocClient.send(command);
            return result.Items || [];
        }
    } catch (error) {
        console.error(`Error al obtener mensajes para el número ${phoneNumber}:`, error);
        throw error;
    }
}

/**
 * Obtiene un mensaje específico por su ID
 * @param {string} messageId - ID del mensaje
 * @returns {Promise<Object|null>} - Datos del mensaje o null si no existe
 */
async function getMessageById(messageId) {
    try {
        // Configurar el comando para obtener el registro
        const command = new GetCommand({
            TableName: AWS_CONFIG.DYNAMODB_TABLE_NAME,
            Key: {
                id: messageId
            }
        });
        
        // Ejecutar el comando
        const result = await ddbDocClient.send(command);
        
        return result.Item || null;
    } catch (error) {
        console.error(`Error al obtener mensaje con ID ${messageId}:`, error);
        throw error;
    }
}

module.exports = {
    saveMessageData,
    getMessagesByPhone,
    getMessageById
}; 