/**
 * Función Lambda para gestionar las relaciones entre usuarios de Cognito y números de teléfono
 * Maneja las siguientes operaciones:
 * - Obtener números de teléfono de un usuario
 * - Asociar un número de teléfono a un usuario
 * - Desasociar un número de teléfono de un usuario
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

// Nombre de la tabla en DynamoDB
const USER_PHONES_TABLE = process.env.USER_PHONES_TABLE || 'user-phone-association';

// Cliente de DynamoDB
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' });
const docClient = DynamoDBDocumentClient.from(ddbClient);

/**
 * Manejador principal de la función Lambda
 */
exports.handler = async (event) => {
    console.log('Evento recibido:', JSON.stringify(event));
    
    try {
        // Extraer operación de la ruta
        const routeKey = event.requestContext?.routeKey || event.requestContext?.http?.routeKey;
        console.log('Ruta:', routeKey);
        
        // Extraer cuerpo de la solicitud
        let body = {};
        try {
            body = event.body ? JSON.parse(event.body) : {};
        } catch (e) {
            console.error('Error al parsear el cuerpo:', e);
        }
        
        // Extraer username del token JWT (si está disponible)
        let tokenUsername = '';
        if (event.requestContext?.authorizer?.jwt?.claims?.username) {
            tokenUsername = event.requestContext.authorizer.jwt.claims.username;
        } else if (event.requestContext?.authorizer?.claims?.username) {
            tokenUsername = event.requestContext.authorizer.claims.username;
        }
        
        // Usar el username del token o del cuerpo
        const username = tokenUsername || body.username;
        
        // Verificar si hay username
        if (!username) {
            return createResponse(400, { error: 'Username es requerido' });
        }
        
        // Manejar según la operación
        if (routeKey === 'POST /user-phones') {
            // Obtener números de teléfono de un usuario
            return await getUserPhoneNumbers(username);
        } else if (routeKey === 'POST /associate-phone') {
            // Asociar un número de teléfono a un usuario
            const { phoneNumber } = body;
            if (!phoneNumber) {
                return createResponse(400, { error: 'phoneNumber es requerido' });
            }
            return await associatePhoneNumber(username, phoneNumber);
        } else if (routeKey === 'POST /disassociate-phone') {
            // Desasociar un número de teléfono de un usuario
            const { phoneNumber } = body;
            if (!phoneNumber) {
                return createResponse(400, { error: 'phoneNumber es requerido' });
            }
            return await disassociatePhoneNumber(username, phoneNumber);
        } else {
            // Operación no reconocida
            return createResponse(400, { error: 'Operación no válida' });
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return createResponse(500, { error: 'Error interno del servidor' });
    }
};

/**
 * Obtener números de teléfono de un usuario
 */
async function getUserPhoneNumbers(username) {
    try {
        // Obtener el elemento de DynamoDB
        const params = {
            TableName: USER_PHONES_TABLE,
            Key: {
                username
            }
        };
        
        const result = await docClient.send(new GetCommand(params));
        
        // Si no existe el usuario en la tabla, devolver array vacío
        if (!result.Item) {
            // Si es admin, devolver array vacío (puede ver todo)
            if (username === 'admin') {
                return createResponse(200, { phoneNumbers: [] });
            }
            
            // Si no existe y no es admin, usar datos de fallback (solo para desarrollo)
            return createFallbackResponse(username);
        }
        
        // Devolver los números de teléfono asociados
        return createResponse(200, { 
            phoneNumbers: result.Item.phoneNumbers || []
        });
    } catch (error) {
        console.error('Error al obtener números de teléfono:', error);
        return createResponse(500, { error: 'Error al obtener números de teléfono' });
    }
}

/**
 * Asociar un número de teléfono a un usuario
 */
async function associatePhoneNumber(username, phoneNumber) {
    try {
        // Primero, verificar si el usuario ya existe en la tabla
        const getParams = {
            TableName: USER_PHONES_TABLE,
            Key: {
                username
            }
        };
        
        const result = await docClient.send(new GetCommand(getParams));
        
        // Normalizar el formato del número de teléfono
        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        
        if (!result.Item) {
            // Si no existe, crear nuevo elemento
            const putParams = {
                TableName: USER_PHONES_TABLE,
                Item: {
                    username,
                    phoneNumbers: [normalizedPhone]
                }
            };
            
            await docClient.send(new PutCommand(putParams));
        } else {
            // Si existe, actualizar el array de números si no contiene ya el número
            const existingPhones = result.Item.phoneNumbers || [];
            
            // Verificar si el número ya existe
            if (existingPhones.includes(normalizedPhone)) {
                return createResponse(200, { 
                    message: 'El número ya está asociado a este usuario',
                    phoneNumbers: existingPhones
                });
            }
            
            // Actualizar el array de números
            const updateParams = {
                TableName: USER_PHONES_TABLE,
                Key: {
                    username
                },
                UpdateExpression: 'SET phoneNumbers = list_append(if_not_exists(phoneNumbers, :emptyList), :newPhone)',
                ExpressionAttributeValues: {
                    ':emptyList': [],
                    ':newPhone': [normalizedPhone]
                },
                ReturnValues: 'ALL_NEW'
            };
            
            const updateResult = await docClient.send(new UpdateCommand(updateParams));
            
            // Devolver los números actualizados
            return createResponse(200, { 
                message: 'Número asociado correctamente',
                phoneNumbers: updateResult.Attributes.phoneNumbers
            });
        }
        
        // Si llegamos aquí, es porque creamos un nuevo elemento
        return createResponse(200, { 
            message: 'Número asociado correctamente',
            phoneNumbers: [normalizedPhone]
        });
    } catch (error) {
        console.error('Error al asociar número de teléfono:', error);
        return createResponse(500, { error: 'Error al asociar número de teléfono' });
    }
}

/**
 * Desasociar un número de teléfono de un usuario
 */
async function disassociatePhoneNumber(username, phoneNumber) {
    try {
        // Primero, verificar si el usuario existe en la tabla
        const getParams = {
            TableName: USER_PHONES_TABLE,
            Key: {
                username
            }
        };
        
        const result = await docClient.send(new GetCommand(getParams));
        
        // Si no existe, devolver error
        if (!result.Item) {
            return createResponse(404, { error: 'Usuario no encontrado' });
        }
        
        // Normalizar el formato del número de teléfono
        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        
        // Verificar si el número existe en el array
        const existingPhones = result.Item.phoneNumbers || [];
        const phoneIndex = existingPhones.indexOf(normalizedPhone);
        
        if (phoneIndex === -1) {
            return createResponse(404, { 
                error: 'El número no está asociado a este usuario',
                phoneNumbers: existingPhones
            });
        }
        
        // Eliminar el número del array
        existingPhones.splice(phoneIndex, 1);
        
        // Actualizar el elemento en DynamoDB
        const updateParams = {
            TableName: USER_PHONES_TABLE,
            Key: {
                username
            },
            UpdateExpression: 'SET phoneNumbers = :phones',
            ExpressionAttributeValues: {
                ':phones': existingPhones
            },
            ReturnValues: 'ALL_NEW'
        };
        
        const updateResult = await docClient.send(new UpdateCommand(updateParams));
        
        // Devolver los números actualizados
        return createResponse(200, { 
            message: 'Número desasociado correctamente',
            phoneNumbers: updateResult.Attributes.phoneNumbers
        });
    } catch (error) {
        console.error('Error al desasociar número de teléfono:', error);
        return createResponse(500, { error: 'Error al desasociar número de teléfono' });
    }
}

/**
 * Normalizar el formato del número de teléfono
 */
function normalizePhoneNumber(phone) {
    // Eliminar todos los espacios y caracteres no numéricos excepto el signo +
    let normalized = String(phone).replace(/[^0-9+]/g, '');
    
    // Asegurar que comience con + si no lo tiene
    if (!normalized.startsWith('+')) {
        normalized = '+' + normalized;
    }
    
    return normalized;
}

/**
 * Crear respuesta para API Gateway
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

/**
 * Crear respuesta de fallback con datos mock
 * Solo para desarrollo y testing
 */
function createFallbackResponse(username) {
    console.log('Creando respuesta de fallback para:', username);
    
    // Datos mock según el usuario
    let phoneNumbers = [];
    
    if (username === 'admin') {
        phoneNumbers = [];  // El admin no tiene restricciones
    } else if (username === 'usuario1') {
        phoneNumbers = ['+5491122334455', '+5493512347050'];
    } else if (username === 'usuario2') {
        phoneNumbers = ['+5491133445566', '+5493512347051'];
    } else if (username === 'usuario3') {
        phoneNumbers = ['+5491144556677'];
    }
    
    return createResponse(200, { phoneNumbers });
} 