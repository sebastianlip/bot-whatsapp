/**
 * Configuración de los comandos disponibles en el bot
 */
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
    }
}; 