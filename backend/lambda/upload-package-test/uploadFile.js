const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Configuración
const BUCKET_NAME = 'whatsapp-bot-files';
const TABLE_NAME = 'whatsapp-messages';

exports.handler = async (event) => {
    console.log('Evento recibido COMPLETO:', JSON.stringify(event, null, 2));
    
    try {
        // Imprimir la estructura exacta del evento
        console.log('Tipo de evento:', typeof event);
        console.log('¿event.body existe?', event.body !== undefined);
        console.log('Tipo de event.body:', typeof event.body);
        
        // Analizar el cuerpo de la solicitud - CORREGIDO PARA API GATEWAY
        let body;
        try {
            // En API Gateway en modo proxy, los datos vienen en event.body como string
            if (event.body) {
                console.log('Parseando datos desde event.body');
                body = JSON.parse(event.body);
            } 
            // Si la estructura es diferente, intentar otras alternativas
            else if (event.username && event.phoneNumber && event.fileContent) {
                console.log('Usando evento directamente como payload');
                body = event;
            } 
            // Si no se puede determinar la estructura
            else {
                console.error('Estructura de datos no reconocida');
                return createResponse(400, { 
                    error: 'Estructura de datos no reconocida', 
                    eventType: typeof event,
                    hasBody: !!event.body,
                    bodyType: typeof event.body
                });
            }
        } catch (parseError) {
            console.error('Error al parsear el body:', parseError);
            console.log('Body original:', event.body);
            return createResponse(400, { error: 'Error al analizar la solicitud', details: parseError.message });
        }
        console.log('Cuerpo de la solicitud final (estructura):', Object.keys(body));
        
        // Extraer los datos del cuerpo
        const { 
            username, 
            phoneNumber, 
            fileContent, 
            fileName, 
            fileType, 
            contactName 
        } = body;
        
        // Imprimir cada propiedad para depuración
        console.log('username:', typeof username, username ? 'presente' : 'ausente');
        console.log('phoneNumber:', typeof phoneNumber, phoneNumber ? 'presente' : 'ausente');
        console.log('fileContent:', typeof fileContent, fileContent ? `${fileContent.length} caracteres` : 'ausente');
        console.log('fileName:', typeof fileName, fileName || 'ausente');
        console.log('fileType:', typeof fileType, fileType || 'ausente');
        console.log('contactName:', typeof contactName, contactName || 'ausente');
        
        // Registrar los primeros 100 caracteres del contenido para depuración
        const fileContentPreview = fileContent ? `${fileContent.substring(0, 100)}...` : 'null';
        console.log('Datos recibidos:', JSON.stringify({
            username,
            phoneNumber,
            fileContentLength: fileContent ? fileContent.length : 0,
            fileContentPreview,
            fileName,
            fileType,
            contactName
        }));
        
        // Validación mejorada de campos
        const validationErrors = [];
        if (!username) validationErrors.push('username es requerido');
        if (!phoneNumber) validationErrors.push('phoneNumber es requerido');
        if (!fileContent) validationErrors.push('fileContent es requerido');
        
        if (validationErrors.length > 0) {
            console.log('Errores de validación:', validationErrors);
            return createResponse(400, { 
                error: 'Se requieren username, phoneNumber y fileContent',
                validationErrors,
                received: {
                    username,
                    phoneNumber,
                    fileContentLength: fileContent ? fileContent.length : 0,
                    hasUsername: !!username,
                    hasPhoneNumber: !!phoneNumber,
                    hasFileContent: !!fileContent
                }
            });
        }
        
        // Decodificar contenido Base64
        let decodedFile;
        try {
            decodedFile = Buffer.from(fileContent, 'base64');
            console.log('Contenido Base64 decodificado correctamente, tamaño:', decodedFile.length);
        } catch (decodeError) {
            console.error('Error al decodificar Base64:', decodeError);
            return createResponse(400, { 
                error: 'Error al decodificar el contenido Base64', 
                details: decodeError.message 
            });
        }
        
        // Generar un nombre único para el archivo
        const timestamp = new Date().getTime();
        const fileExtension = fileName ? fileName.split('.').pop() : 'png';
        const s3Key = `${fileType || 'image'}/${timestamp}-${uuidv4().substring(0, 8)}.${fileExtension}`;
        
        console.log('Intentando subir archivo a S3 con clave:', s3Key);
        
        // Subir archivo a S3
        try {
            const s3Result = await s3.putObject({
                Bucket: BUCKET_NAME,
                Key: s3Key,
                Body: decodedFile,
                ContentType: determineContentType(fileExtension)
            }).promise();
            
            console.log('Archivo subido a S3 exitosamente:', s3Result);
        } catch (s3Error) {
            console.error('Error al subir archivo a S3:', s3Error);
            return createResponse(500, { 
                error: 'Error al subir archivo a S3', 
                details: s3Error.message 
            });
        }
        
        // Crear registro en DynamoDB
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
        
        try {
            const dbResult = await dynamoDB.put({
                TableName: TABLE_NAME,
                Item: item
            }).promise();
            
            console.log('Metadata guardada en DynamoDB exitosamente:', dbResult);
        } catch (dbError) {
            console.error('Error al guardar en DynamoDB:', dbError);
            return createResponse(500, { 
                error: 'Error al guardar metadata en DynamoDB', 
                details: dbError.message 
            });
        }
        
        // Generar URL firmada para el archivo subido
        let fileUrl;
        try {
            fileUrl = await getSignedUrl(s3Key);
            console.log('URL firmada generada:', fileUrl);
        } catch (urlError) {
            console.error('Error al generar URL firmada:', urlError);
            // Continuamos a pesar del error en la URL
            fileUrl = 'Error al generar URL';
        }
        
        return createResponse(200, {
            message: 'Archivo subido exitosamente',
            s3Key,
            fileUrl,
            item
        });
        
    } catch (error) {
        console.error('Error en la función Lambda:', error);
        console.error('Tipo de error:', typeof error);
        console.error('Mensaje de error:', error.message);
        console.error('Stack de error:', error.stack);
        return createResponse(500, { error: 'Error interno del servidor', details: error.message });
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
            'Access-Control-Allow-Origin': '*', // Permitir cualquier origen en desarrollo
            'Access-Control-Allow-Credentials': true,
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
        },
        body: JSON.stringify(body)
    };
} 
