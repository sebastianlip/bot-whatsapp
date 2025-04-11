/**
 * Simulador de mensajes de WhatsApp para probar la integración con AWS
 * Este script simula el envío de mensajes y archivos como si vinieran de WhatsApp
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

// Importar servicios AWS
const s3Service = require('../src/services/s3Service');
const dynamoDbService = require('../src/services/dynamoDbService');

// Cargar variables de entorno
dotenv.config();

/**
 * Simula un objeto de mensaje de WhatsApp
 */
class MockWhatsAppMessage {
    constructor(options = {}) {
        this.id = {
            _serialized: options.id || `mock_${uuidv4()}`
        };
        this.from = options.from || '123456789@c.us';
        this.to = options.to || '987654321@c.us';
        this.body = options.body || 'Mensaje de prueba';
        this.type = options.type || 'chat';
        this.timestamp = Date.now() / 1000;
        this.hasMedia = options.hasMedia || false;
        this._mimetype = options.mimetype;
        this._filename = options.filename;
        this._mediaPath = options.mediaPath;
        this._contact = {
            number: options.from?.split('@')[0] || '123456789',
            name: options.contactName || 'Usuario Simulado',
            pushname: options.contactName || 'Usuario Simulado'
        };
        this._chat = {
            name: 'Chat Simulado',
            isGroup: false
        };
    }

    async getContact() {
        return this._contact;
    }

    async getChat() {
        return this._chat;
    }

    async reply(text) {
        console.log(`[BOT RESPUESTA] → ${text}`);
        return true;
    }

    async downloadMedia() {
        if (!this.hasMedia || !this._mediaPath) {
            return null;
        }

        try {
            const fileData = fs.readFileSync(this._mediaPath);
            return {
                data: fileData.toString('base64'),
                mimetype: this._mimetype,
                filename: this._filename || path.basename(this._mediaPath)
            };
        } catch (error) {
            console.error('Error al leer el archivo simulado:', error);
            return null;
        }
    }
}

/**
 * Simulador de mensajes WhatsApp
 */
class WhatsAppSimulator {
    constructor() {
        this.phoneNumber = '123456789';
        this.contactName = 'Usuario Simulado';
    }

    /**
     * Simula el envío de un mensaje de texto
     * @param {string} text - Texto del mensaje
     */
    async sendTextMessage(text) {
        console.log(`\n[USUARIO] Envía texto: "${text}"`);
        
        const message = new MockWhatsAppMessage({
            from: `${this.phoneNumber}@c.us`,
            body: text,
            type: 'chat',
            contactName: this.contactName
        });

        // Crear objeto de datos para DynamoDB
        const messageData = {
            messageId: message.id._serialized,
            phoneNumber: this.phoneNumber,
            contactName: this.contactName,
            timestamp: new Date().toISOString(),
            chatName: 'Chat Simulado',
            isGroup: false,
            type: 'text',
            content: text
        };

        try {
            // Guardar en DynamoDB
            const result = await dynamoDbService.saveMessageData(messageData);
            console.log(`[ÉXITO] Mensaje de texto guardado en DynamoDB con ID: ${result.id || result.messageId}`);
            return true;
        } catch (error) {
            console.error('[ERROR] Error al guardar mensaje de texto:', error);
            return false;
        }
    }

    /**
     * Simula el envío de un archivo
     * @param {string} filePath - Ruta al archivo
     * @param {string} caption - Texto opcional junto al archivo
     */
    async sendFile(filePath, caption = '') {
        const fullPath = path.resolve(filePath);
        
        if (!fs.existsSync(fullPath)) {
            console.error(`[ERROR] El archivo no existe: ${fullPath}`);
            return false;
        }

        const filename = path.basename(fullPath);
        const fileExt = path.extname(fullPath).toLowerCase();
        
        // Determinar tipo MIME basado en la extensión
        let mimetype = 'application/octet-stream';
        let type = 'document';
        
        if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExt)) {
            mimetype = `image/${fileExt.substring(1)}`;
            type = 'image';
        } else if (['.mp4', '.mov', '.avi'].includes(fileExt)) {
            mimetype = `video/${fileExt.substring(1)}`;
            type = 'video';
        } else if (['.mp3', '.ogg', '.wav'].includes(fileExt)) {
            mimetype = `audio/${fileExt.substring(1)}`;
            type = 'audio';
        } else if (fileExt === '.pdf') {
            mimetype = 'application/pdf';
            type = 'document';
        } else if (['.doc', '.docx'].includes(fileExt)) {
            mimetype = 'application/msword';
            type = 'document';
        }

        console.log(`\n[USUARIO] Envía archivo: "${filename}" (${mimetype})`);
        
        // Crear mensaje simulado
        const message = new MockWhatsAppMessage({
            from: `${this.phoneNumber}@c.us`,
            body: caption || filename,
            type: type,
            hasMedia: true,
            mimetype: mimetype,
            filename: filename,
            mediaPath: fullPath,
            contactName: this.contactName
        });

        try {
            // Procesar el archivo como si fuera WhatsApp
            const media = await message.downloadMedia();
            
            if (!media) {
                console.error('[ERROR] No se pudo leer el archivo');
                return false;
            }

            // Subir a S3
            const fileBuffer = Buffer.from(media.data, 'base64');
            const folder = type; // Usar el tipo como carpeta (image, video, document, etc.)
            
            const s3Result = await s3Service.uploadFile(fileBuffer, filename, mimetype, folder);
            
            // Crear objeto para DynamoDB
            const messageData = {
                messageId: message.id._serialized,
                phoneNumber: this.phoneNumber,
                contactName: this.contactName,
                timestamp: new Date().toISOString(),
                chatName: 'Chat Simulado',
                isGroup: false,
                type: type,
                mimetype: mimetype,
                filename: filename,
                s3Key: s3Result.key,
                fileUrl: s3Result.fileUrl,
                caption: caption || ''
            };
            
            // Guardar en DynamoDB
            const result = await dynamoDbService.saveMessageData(messageData);
            
            console.log(`[ÉXITO] Archivo subido a S3: ${s3Result.fileUrl}`);
            console.log(`[ÉXITO] Información guardada en DynamoDB con ID: ${result.id || result.messageId}`);
            
            return true;
        } catch (error) {
            console.error('[ERROR] Error al procesar archivo:', error);
            return false;
        }
    }

    /**
     * Obtiene los mensajes guardados en DynamoDB para este número
     */
    async getMessages() {
        console.log(`\n[USUARIO] Consulta sus mensajes...`);
        
        try {
            const messages = await dynamoDbService.getMessagesByPhone(this.phoneNumber);
            
            if (!messages || messages.length === 0) {
                console.log('[INFO] No se encontraron mensajes para este número.');
                return [];
            }
            
            console.log(`[ÉXITO] Se encontraron ${messages.length} mensajes:`);
            
            messages.forEach((msg, index) => {
                const date = new Date(msg.timestamp).toLocaleString();
                
                if (msg.type === 'text') {
                    console.log(`${index + 1}. [${date}] TEXTO: ${msg.content}`);
                } else {
                    console.log(`${index + 1}. [${date}] ARCHIVO (${msg.type}): ${msg.filename}`);
                    if (msg.fileUrl) {
                        console.log(`   URL: ${msg.fileUrl}`);
                    }
                }
            });
            
            return messages;
        } catch (error) {
            console.error('[ERROR] Error al obtener mensajes:', error);
            return [];
        }
    }
}

/**
 * Ejecuta la simulación de prueba
 */
async function runSimulation() {
    console.log('='.repeat(70));
    console.log('SIMULADOR DE WHATSAPP PARA PRUEBAS DE AWS');
    console.log('='.repeat(70));
    
    const simulator = new WhatsAppSimulator();
    
    try {
        // Simular mensaje de texto
        await simulator.sendTextMessage('Hola, este es un mensaje de prueba');
        
        // Simular envío de archivo de texto
        await simulator.sendFile('test/files/sample.txt', 'Aquí va un documento de texto');
        
        // Crear un archivo de imagen simple usando Node
        const tempImagePath = path.join(__dirname, 'files', 'temp-image.png');
        
        // Este código genera una imagen muy simple
        try {
            // Imagen de prueba (un cuadrado negro de 100x100)
            const imageData = Buffer.from([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
                0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00, 0x64, 0x01, 0x03, 0x00, 0x00, 0x00, 0xF6, 0xDE, 0xF7,
                0x60, 0x00, 0x00, 0x00, 0x03, 0x50, 0x4C, 0x54, 0x45, 0x00, 0x00, 0x00, 0xA7, 0x7A, 0x3D, 0xDA,
                0x00, 0x00, 0x00, 0x01, 0x74, 0x52, 0x4E, 0x53, 0x00, 0x40, 0xE6, 0xD8, 0x66, 0x00, 0x00, 0x00,
                0x1F, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0x60, 0x00, 0x01, 0x46, 0x30, 0xCD, 0xC2, 0x00,
                0xA6, 0x58, 0xC1, 0x34, 0x1B, 0x98, 0x66, 0x07, 0xD3, 0x1C, 0x60, 0x1A, 0x00, 0x36, 0x01, 0x04,
                0x01, 0x0F, 0x85, 0xAB, 0x05, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60,
                0x82
            ]);
            
            fs.writeFileSync(tempImagePath, imageData);
            console.log(`[INFO] Imagen temporal creada en: ${tempImagePath}`);
            
            // Simular envío de imagen
            await simulator.sendFile(tempImagePath, 'Prueba de imagen');
        } catch (imageError) {
            console.error('[ERROR] Error al crear imagen de prueba:', imageError);
        }
        
        // Consultar mensajes guardados
        await simulator.getMessages();
        
        console.log('\n='.repeat(70));
        console.log('SIMULACIÓN COMPLETADA');
        console.log('='.repeat(70));
    } catch (error) {
        console.error('Error durante la simulación:', error);
    }
}

// Ejecutar la simulación
runSimulation().catch(console.error); 