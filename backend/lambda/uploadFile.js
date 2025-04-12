const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Configuración
const BUCKET_NAME = 'whatsapp-bot-files';
const TABLE_NAME = 'whatsapp-messages';

exports.handler = async (event) => {
    console.log('Evento recibido:', typeof event);
    
    // Omitimos la impresión del evento completo porque puede ser muy grande con archivos base64
    
    try {
        // 1. Analizar el cuerpo de la solicitud
        let body;
        try {
            // Si event.body es un string, intentar parsearlo como JSON
            if (event.body && typeof event.body === 'string') {
                body = JSON.parse(event.body);
                console.log('Body parseado correctamente desde event.body');
            } 
            // Si no hay event.body pero el evento mismo tiene los campos esperados
            else if (event.username && event.phoneNumber && event.fileContent) {
                body = event;
                console.log('Usando evento mismo como body');
            }
            // Si no se puede determinar la estructura
            else {
                console.error('Estructura de datos no reconocida');
                return createResponse(400, { 
                    error: 'Estructura de datos no reconocida',
                    details: 'No se pudo determinar la estructura de la solicitud'
                });
            }
        } catch (parseError) {
            console.error('Error al parsear el body:', parseError);
            return createResponse(400, { 
                error: 'Error al analizar la solicitud', 
                details: parseError.message 
            });
        }
        
        // 2. Extraer y validar los campos requeridos
        const { username, phoneNumber, fileContent, fileName, fileType, contactName } = body;
        
        // Validación de campos obligatorios
        if (!username || !phoneNumber || !fileContent) {
            console.log('Faltan campos obligatorios:', {
                hasUsername: !!username,
                hasPhoneNumber: !!phoneNumber,
                hasFileContent: !!fileContent
            });
            
            return createResponse(400, { 
                error: 'Se requieren username, phoneNumber y fileContent',
                received: {
                    hasUsername: !!username,
                    hasPhoneNumber: !!phoneNumber,
                    hasFileContent: !!fileContent
                }
            });
        }
        
        // 3. Procesamiento de la solicitud
        console.log('Procesando solicitud para:', username, phoneNumber);
        
        // Decodificar contenido Base64
        const decodedFile = Buffer.from(fileContent, 'base64');
        
        // 4. Generar nombre único para el archivo en S3
        const timestamp = new Date().getTime();
        const fileExtension = fileName ? fileName.split('.').pop() : 'png';
        const s3Key = `${fileType || 'image'}/${timestamp}-${uuidv4().substring(0, 8)}.${fileExtension}`;
        
        console.log('Subiendo archivo a S3 con clave:', s3Key);
        
        // 5. Subir archivo a S3
        await s3.putObject({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: decodedFile,
            ContentType: determineContentType(fileExtension)
        }).promise();
        
        console.log('Archivo subido a S3 exitosamente');
        
        // 6. Guardar metadatos en DynamoDB
        const item = {
            id: `msg-${timestamp}`,
            username,
            phoneNumber,
            timestamp: new Date().toISOString(),
            s3Key,
            fileName: fileName || `file.${fileExtension}`,
            contactName: contactName || 'Usuario WhatsApp',
            fileType: fileType || determineFileType(fileExtension)
        };
        
        await dynamoDB.put({
            TableName: TABLE_NAME,
            Item: item
        }).promise();
        
        console.log('Metadatos guardados en DynamoDB');
        
        // 7. Generar URL firmada para el archivo
        const fileUrl = await getSignedUrl(s3Key);
        
        // 8. Responder al cliente
        return createResponse(200, {
            message: 'Archivo subido exitosamente',
            s3Key,
            fileUrl,
            item
        });
        
    } catch (error) {
        console.error('Error en la función Lambda:', error);
        return createResponse(500, { 
            error: 'Error interno del servidor',
            message: error.message
        });
    }
};

/**
 * Genera una URL firmada para descargar un archivo de S3
 */
async function getSignedUrl(key) {
    const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Expires: 3600 // URL válida por 1 hora
    };
    
    return s3.getSignedUrlPromise('getObject', params);
}

/**
 * Determina el tipo de contenido basado en la extensión
 */
function determineContentType(extension) {
    const contentTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'mp4': 'video/mp4',
        'svg': 'image/svg+xml',
        'txt': 'text/plain'
    };
    
    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Determina el tipo de archivo basado en la extensión
 */
function determineFileType(extension) {
    const ext = extension.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
        return 'image';
    } else if (['mp4', 'avi', 'mov', 'webm'].includes(ext)) {
        return 'video';
    } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext)) {
        return 'document';
    } else if (['mp3', 'wav', 'ogg', 'opus'].includes(ext)) {
        return 'audio';
    }
    
    return 'file';
}

/**
 * Crea una respuesta HTTP para API Gateway
 */
function createResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
        },
        body: JSON.stringify(body)
    };
} 
