const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// ConfiguraciÃ³n
const BUCKET_NAME = 'whatsapp-bot-files';
const TABLE_NAME = 'whatsapp-messages';
const EXPIRATION_TIME = 3600; // URL firmada vÃ¡lida por 1 hora

exports.handler = async (event) => {
    console.log('Evento recibido:', JSON.stringify(event));
    
    try {
        // Analizar el cuerpo de la solicitud
        const body = JSON.parse(event.body || '{}');
        const { username, phoneNumber } = body;
        
        if (!username) {
            return createResponse(400, { error: 'Se requiere un nombre de usuario' });
        }
        
        // Determinar el tipo de operaciÃ³n
        let items;
        if (event.path === '/files') {
            // Obtener todos los archivos del usuario
            items = await getAllFiles(username);
        } else if (event.path === '/files/filter' && phoneNumber) {
            // Obtener archivos filtrados por nÃºmero de telÃ©fono
            items = await getFilesByPhoneNumber(username, phoneNumber);
        } else if (event.path === '/download' && event.queryStringParameters && event.queryStringParameters.key) {
            // Generar URL de descarga firmada para un archivo
            const url = await getSignedUrl(event.queryStringParameters.key);
            return createResponse(200, { url });
        } else {
            return createResponse(400, { error: 'OperaciÃ³n no vÃ¡lida' });
        }
        
        // Procesar los elementos obtenidos
        const processedItems = await processItems(items);
        
        return createResponse(200, { 
            items: processedItems,
            count: processedItems.length
        });
    } catch (error) {
        console.error('Error en la funciÃ³n Lambda:', error);
        return createResponse(500, { error: 'Error interno del servidor' });
    }
};

/**
 * Obtiene todos los archivos de un usuario desde DynamoDB
 */
async function getAllFiles(username) {
    const params = {
        TableName: TABLE_NAME,
        FilterExpression: 'username = :username AND attribute_exists(s3Key)',
        ExpressionAttributeValues: {
            ':username': username
        }
    };
    
    console.log('Obteniendo archivos para el usuario:', username);
    const result = await dynamoDB.scan(params).promise();
    return result.Items || [];
}

/**
 * Obtiene archivos filtrados por nÃºmero de telÃ©fono
 */
async function getFilesByPhoneNumber(username, phoneNumber) {
    const params = {
        TableName: TABLE_NAME,
        FilterExpression: 'username = :username AND phoneNumber = :phoneNumber AND attribute_exists(s3Key)',
        ExpressionAttributeValues: {
            ':username': username,
            ':phoneNumber': phoneNumber
        }
    };
    
    console.log(`Obteniendo archivos para usuario: ${username}, telÃ©fono: ${phoneNumber}`);
    const result = await dynamoDB.scan(params).promise();
    return result.Items || [];
}

/**
 * Genera una URL firmada para descargar un archivo de S3
 */
async function getSignedUrl(key) {
    const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Expires: EXPIRATION_TIME
    };
    
    return s3.getSignedUrlPromise('getObject', params);
}

/**
 * Procesa la lista de elementos obtenidos de DynamoDB
 */
async function processItems(items) {
    // Generar URLs firmadas para cada elemento
    return Promise.all(items.map(async (item) => {
        if (item.s3Key) {
            try {
                item.downloadUrl = await getSignedUrl(item.s3Key);
            } catch (error) {
                console.error(`Error al generar URL firmada para ${item.s3Key}:`, error);
                item.downloadUrl = null;
            }
        }
        return item;
    }));
}

/**
 * Crea una respuesta HTTP para API Gateway
 */
function createResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
        },
        body: JSON.stringify(body)
    };
} 