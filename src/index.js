const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const dotenv = require('dotenv');
const commands = require('../config/commands');
const whatsappService = require('./services/whatsappService');

// Cargar variables de entorno
dotenv.config();

// Configuración del cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: process.env.SESSION_DATA_PATH || './session'
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Generar código QR para autenticación
client.on('qr', (qr) => {
    console.log('QR GENERADO. Escanea con la app de WhatsApp:');
    qrcode.generate(qr, {small: true});
});

// Manejar evento de autenticación
client.on('authenticated', () => {
    console.log('AUTENTICADO');
});

// Manejar evento de inicio de sesión
client.on('ready', () => {
    console.log('Cliente listo y conectado!');
});

// Manejar mensajes entrantes
client.on('message', async (message) => {
    console.log(`Mensaje recibido: ${message.body}`);
    
    // Verificar si el mensaje es un comando
    const commandName = message.body.split(' ')[0];
    
    if (commands[commandName]) {
        try {
            await commands[commandName].handler(message);
        } catch (error) {
            console.error(`Error al procesar el comando ${commandName}:`, error);
            message.reply('Ocurrió un error al procesar el comando.');
        }
    } else if (message.body === '!hola') {
        // Mantener el comando básico para compatibilidad
        message.reply('¡Hola! Soy un bot de WhatsApp. Usa !ayuda para ver los comandos disponibles.');
    } else {
        // Si no es un comando conocido, procesamos el mensaje para guardarlo en AWS
        try {
            await whatsappService.processMessage(message);
        } catch (error) {
            console.error('Error al procesar mensaje para AWS:', error);
        }
    }
});

// Iniciar el cliente
client.initialize();

// Configurar servidor Express para monitoreo
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot de WhatsApp funcionando correctamente');
});

// Ruta para verificar el estado del bot
app.get('/status', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`Servidor de monitoreo iniciado en el puerto ${PORT}`);
});

// Manejar cierre de la aplicación
process.on('SIGINT', async () => {
    console.log('Cerrando aplicación...');
    await client.destroy();
    process.exit(0);
}); 