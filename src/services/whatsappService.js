/**
 * Servicio para manejar la lógica de procesamiento de mensajes de WhatsApp
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { MessageMedia } = require('whatsapp-web.js');
const s3Service = require('./s3Service');
const dynamoDbService = require('./dynamoDbService');

// Mapa de tipos de medios y sus extensiones
const MEDIA_TYPES = {
    'image': { folder: 'images', extensions: ['.jpg', '.jpeg', '.png', '.gif'] },
    'video': { folder: 'videos', extensions: ['.mp4', '.mov', '.avi'] },
    'document': { folder: 'documents', extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'] },
    'audio': { folder: 'audios', extensions: ['.mp3', '.ogg', '.wav'] }
};

/**
 * Procesa un mensaje de WhatsApp
 * @param {Object} message - Objeto de mensaje de whatsapp-web.js
 * @returns {Promise<void>}
 */
async function processMessage(message) {
    try {
        // Obtenemos la información del contacto
        const contact = await message.getContact();
        const chat = await message.getChat();
        
        // Información básica para todos los mensajes
        const messageData = {
            messageId: message.id._serialized,
            phoneNumber: contact.number,
            contactName: contact.name || contact.pushname || 'Desconocido',
            timestamp: new Date(message.timestamp * 1000).toISOString(),
            chatName: chat.name || 'Chat Individual',
            isGroup: chat.isGroup
        };
        
        console.log(`Procesando mensaje de ${messageData.contactName} (${messageData.phoneNumber})`);
        
        // Si es un mensaje de texto
        if (message.type === 'chat') {
            messageData.type = 'text';
            messageData.content = message.body;
            
            // Guardar en DynamoDB
            await dynamoDbService.saveMessageData(messageData);
            console.log(`Mensaje de texto guardado en DynamoDB, ID: ${messageData.messageId}`);
            
            return;
        }
        
        // Si es un mensaje con medios
        if (message.hasMedia) {
            // Descargar el archivo
            const media = await message.downloadMedia();
            
            if (!media) {
                console.log('No se pudo descargar el medio.');
                return;
            }
            
            messageData.type = media.mimetype.split('/')[0]; // image, video, audio, etc.
            messageData.mimetype = media.mimetype;
            messageData.filename = media.filename || generateFilename(media.mimetype);
            
            // Guardar el archivo en una ubicación temporal si viene en base64
            if (media.data) {
                const tempDir = path.join(os.tmpdir(), 'whatsapp-media');
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }
                
                const tempFilePath = path.join(tempDir, messageData.filename);
                fs.writeFileSync(tempFilePath, Buffer.from(media.data, 'base64'));
                
                // Subir a S3
                const mediaType = messageData.type;
                const folder = MEDIA_TYPES[mediaType]?.folder || 'otros';
                
                const s3Result = await s3Service.uploadFileFromPath(tempFilePath, media.mimetype, folder);
                
                // Actualizar los datos del mensaje con la información de S3
                messageData.s3Key = s3Result.key;
                messageData.fileUrl = s3Result.fileUrl;
                
                // Eliminar el archivo temporal
                fs.unlinkSync(tempFilePath);
            }
            
            // Guardar en DynamoDB
            await dynamoDbService.saveMessageData(messageData);
            console.log(`Mensaje con medios guardado en DynamoDB y S3, ID: ${messageData.messageId}`);
            
            // Responder al usuario confirmando la recepción
            await message.reply(`Archivo recibido y guardado correctamente.`);
        }
    } catch (error) {
        console.error('Error al procesar mensaje de WhatsApp:', error);
        // Intentar responder al usuario
        try {
            await message.reply('Ocurrió un error al procesar tu mensaje. Por favor, intenta nuevamente.');
        } catch (replyError) {
            console.error('Error al enviar respuesta de error:', replyError);
        }
    }
}

/**
 * Genera un nombre de archivo basado en el tipo MIME
 * @param {string} mimetype - Tipo MIME del archivo
 * @returns {string} - Nombre de archivo generado
 */
function generateFilename(mimetype) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const type = mimetype.split('/')[0];
    
    let extension = '.bin'; // Extensión por defecto
    
    // Determinar la extensión basada en el tipo MIME
    if (mimetype.includes('image/jpeg')) extension = '.jpg';
    else if (mimetype.includes('image/png')) extension = '.png';
    else if (mimetype.includes('image/gif')) extension = '.gif';
    else if (mimetype.includes('video/mp4')) extension = '.mp4';
    else if (mimetype.includes('audio/mpeg')) extension = '.mp3';
    else if (mimetype.includes('audio/ogg')) extension = '.ogg';
    else if (mimetype.includes('application/pdf')) extension = '.pdf';
    
    return `${type}_${timestamp}_${randomString}${extension}`;
}

module.exports = {
    processMessage
}; 