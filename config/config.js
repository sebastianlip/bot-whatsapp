/**
 * Configuración global del bot
 */
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

module.exports = {
    // Configuración del servidor
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost'
    },
    
    // Configuración del bot
    bot: {
        sessionDataPath: process.env.SESSION_DATA_PATH || './session',
        debugMode: process.env.DEBUG_MODE === 'true' || false,
        prefix: '!', // Prefijo para comandos
        adminNumber: process.env.ADMIN_NUMBER || '',
    },
    
    // Textos predefinidos
    messages: {
        welcome: '¡Hola! Soy un bot de WhatsApp. Usa !ayuda para ver los comandos disponibles.',
        unauthorized: 'No tienes permiso para usar este comando.',
        error: 'Ocurrió un error al procesar tu solicitud.',
        commandNotFound: 'Comando no encontrado. Usa !ayuda para ver los comandos disponibles.'
    }
}; 