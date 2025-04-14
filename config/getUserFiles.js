const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// Configuración
const BUCKET_NAME = 'whatsapp-bot-files';
const TABLE_NAME = 'whatsapp-messages';
const EXPIRATION_TIME = 3600; // URL firmada válida por 1 hora

exports.handler = async (event) => {
    console.log('Evento recibido:', JSON.stringify(event));
    
    try {
        // Analizar el cuerpo de la solicitud
        const body = JSON.parse(event.body || '{}');
        const { username, phoneNumber } = body;
        
        if (!username) {
            return createResponse(400, { error: 'Se requiere un nombre de usuario' });
        }
        
        // Determinar el tipo de operación
        let items;
        if (event.path === '/files') {
            // Obtener todos los archivos del usuario, pero sólo los que corresponden a sus números asociados
            items = await getUserFiles(username);
        } else if (event.path === '/files/filter' && phoneNumber) {
            // Obtener archivos filtrados por número de teléfono
            items = await getFilesByPhoneNumber(username, phoneNumber);
        } else if (event.path === '/download' && event.queryStringParameters && event.queryStringParameters.key) {
            // Generar URL de descarga firmada para un archivo
            const url = await getSignedUrl(event.queryStringParameters.key);
            return createResponse(200, { url });
        } else {
            return createResponse(400, { error: 'Operación no válida' });
        }
        
        // Procesar los elementos obtenidos
        const processedItems = await processItems(items);
        
        return createResponse(200, { 
            items: processedItems,
            count: processedItems.length
        });
    } catch (error) {
        console.error('Error en la función Lambda:', error);
        return createResponse(500, { error: 'Error interno del servidor' });
    }
};

/**
 * Obtiene los números de teléfono asociados al usuario
 */
async function getUserPhoneNumbers(username) {
    const params = {
        TableName: 'user-phone-associations', // Tabla donde se almacenan las asociaciones usuario-teléfono
        KeyConditionExpression: 'username = :username',
        ExpressionAttributeValues: {
            ':username': username
        }
    };
    
    try {
        console.log(`Obteniendo números de teléfono para usuario: ${username}`);
        const result = await dynamoDB.query(params).promise();
        
        // Si no hay asociaciones, devolver un array vacío
        if (!result.Items || result.Items.length === 0) {
            // Para el usuario admin, permitir ver todos los archivos
            if (username === 'admin') {
                return null; // null indica que no hay restricción de números
            }
            return [];
        }
        
        // Extraer los números de teléfono
        return result.Items.map(item => item.phoneNumber);
    } catch (error) {
        console.error(`Error al obtener números para usuario ${username}:`, error);
        return [];
    }
}

/**
 * Obtiene todos los archivos de un usuario desde DynamoDB
 */
async function getUserFiles(username) {
    // Primero obtenemos los números asociados al usuario
    const userPhoneNumbers = await getUserPhoneNumbers(username);
    
    // Si el usuario es admin o tiene permisos especiales, puede ver todos los archivos
    if (username === 'admin' || userPhoneNumbers === null) {
        const params = {
            TableName: TABLE_NAME,
            FilterExpression: 'attribute_exists(s3Key)',
        };
        
        console.log('Obteniendo todos los archivos (admin)');
        const result = await dynamoDB.scan(params).promise();
        return result.Items || [];
    }
    
    // Si no hay números asociados, devolver lista vacía
    if (userPhoneNumbers.length === 0) {
        console.log(`No hay números asociados para el usuario: ${username}`);
        return [];
    }
    
    // Construir expresión para filtrar por los números de teléfono del usuario
    const filterExpressions = userPhoneNumbers.map((_, index) => `phoneNumber = :phone${index}`);
    const filterExpression = `(${filterExpressions.join(' OR ')}) AND attribute_exists(s3Key)`;
    
    // Crear mapa de valores para la expresión
    const expressionValues = {};
    userPhoneNumbers.forEach((phoneNumber, index) => {
        expressionValues[`:phone${index}`] = phoneNumber;
    });
    
    const params = {
        TableName: TABLE_NAME,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionValues
    };
    
    console.log(`Obteniendo archivos para los números asociados al usuario: ${username}`);
    console.log('Expresión de filtro:', filterExpression);
    console.log('Valores de expresión:', JSON.stringify(expressionValues));
    
    const result = await dynamoDB.scan(params).promise();
    return result.Items || [];
}

/**
 * Obtiene archivos filtrados por número de teléfono
 */
async function getFilesByPhoneNumber(username, phoneNumber) {
    // Primero verificamos si el usuario tiene permiso para ver archivos de este número
    const userPhoneNumbers = await getUserPhoneNumbers(username);
    
    // Si el usuario es admin o tiene permisos especiales, puede ver todos los archivos
    if (username !== 'admin' && userPhoneNumbers !== null && !userPhoneNumbers.includes(phoneNumber)) {
        console.log(`Usuario ${username} no tiene permiso para ver archivos del número ${phoneNumber}`);
        return [];
    }
    
    const params = {
        TableName: TABLE_NAME,
        FilterExpression: 'phoneNumber = :phoneNumber AND attribute_exists(s3Key)',
        ExpressionAttributeValues: {
            ':phoneNumber': phoneNumber
        }
    };
    
    console.log(`Obteniendo archivos para el número: ${phoneNumber}`);
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