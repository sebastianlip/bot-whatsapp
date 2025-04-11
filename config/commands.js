/**
 * Configuración de los comandos disponibles en el bot
 */
const dynamoDbService = require('../src/services/dynamoDbService');

module.exports = {
    // Comando de ayuda
    '!ayuda': {
        description: 'Muestra la lista de comandos disponibles',
        handler: async (message) => {
            const commandList = Object.keys(module.exports)
                .map(cmd => `${cmd}: ${module.exports[cmd].description}`)
                .join('\n');
            
            return message.reply(`*Comandos disponibles:*\n${commandList}`);
        }
    },
    
    // Comando info
    '!info': {
        description: 'Muestra información sobre el bot',
        handler: async (message) => {
            return message.reply(
                '*Bot de WhatsApp*\n' +
                'Versión: 1.0.0\n' +
                'Desarrollado con Node.js y whatsapp-web.js\n' +
                'Usa !ayuda para ver los comandos disponibles'
            );
        }
    },
    
    // Comando eco
    '!eco': {
        description: 'Repite el mensaje que envíes',
        handler: async (message) => {
            const text = message.body.slice(5); // Eliminar '!eco '
            if (!text) {
                return message.reply('Por favor, escribe algo después de !eco');
            }
            return message.reply(`Eco: ${text}`);
        }
    },
    
    // Comando hora
    '!hora': {
        description: 'Muestra la hora actual',
        handler: async (message) => {
            const now = new Date();
            return message.reply(`La hora actual es: ${now.toLocaleTimeString()}`);
        }
    },
    
    // Comando para obtener los últimos mensajes
    '!mensajes': {
        description: 'Muestra los últimos mensajes recibidos de tu número',
        handler: async (message) => {
            try {
                const contact = await message.getContact();
                const phoneNumber = contact.number;
                
                const messages = await dynamoDbService.getMessagesByPhone(phoneNumber);
                
                if (!messages || messages.length === 0) {
                    return message.reply('No se encontraron mensajes guardados para tu número.');
                }
                
                // Mostrar solo los últimos 5 mensajes para no sobrecargar
                const recentMessages = messages.slice(0, 5);
                
                const messageList = recentMessages.map(msg => {
                    const date = new Date(msg.timestamp).toLocaleString();
                    
                    if (msg.type === 'text') {
                        return `📝 *${date}*: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`;
                    } else {
                        return `📎 *${date}*: Archivo ${msg.type} - ${msg.filename || 'Sin nombre'}`;
                    }
                }).join('\n\n');
                
                return message.reply(`*Tus últimos mensajes:*\n\n${messageList}`);
            } catch (error) {
                console.error('Error al obtener mensajes:', error);
                return message.reply('Ocurrió un error al recuperar tus mensajes.');
            }
        }
    }
}; 