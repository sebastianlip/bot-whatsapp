const fetch = require('node-fetch');

// URL del endpoint de API Gateway
const API_URL = 'https://0wf1nv2l1k.execute-api.us-east-2.amazonaws.com/v1';

// Datos de prueba
const testData = {
    username: 'admin',
    phoneNumber: '+123456789',
    fileContent: 'SGVsbG8gV29ybGQ=', // "Hello World" en Base64
    fileName: 'test.txt',
    fileType: 'document',
    contactName: 'Test User'
};

// Función para probar el endpoint de upload
async function testUploadEndpoint() {
    console.log('Enviando solicitud a:', `${API_URL}/upload`);
    console.log('Datos enviados:', {
        username: testData.username,
        phoneNumber: testData.phoneNumber,
        // No mostrar todo el contenido del archivo
        fileContentLength: testData.fileContent.length,
        fileName: testData.fileName,
        fileType: testData.fileType,
        contactName: testData.contactName
    });
    
    console.log('Body completo JSON:', JSON.stringify(testData, null, 2));

    try {
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });

        const data = await response.json();
        console.log('Respuesta del servidor:', {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            data
        });
        
        // Extraer el cuerpo de la respuesta
        if (data && data.body) {
            try {
                const bodyContent = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
                console.log('Cuerpo de la respuesta decodificado:', bodyContent);
            } catch (err) {
                console.log('No se pudo parsear el cuerpo de la respuesta:', data.body);
            }
        }
    } catch (error) {
        console.error('Error al enviar la solicitud:', error);
    }
}

// Función para probar el endpoint de files
async function testFilesEndpoint() {
    console.log('Enviando solicitud a:', `${API_URL}/files`);
    
    try {
        const response = await fetch(`${API_URL}/files`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: 'admin' })
        });

        const data = await response.json();
        console.log('Respuesta del servidor (files):', {
            status: response.status,
            data
        });
    } catch (error) {
        console.error('Error al obtener archivos:', error);
    }
}

// Ejecutar las pruebas
async function runTests() {
    console.log('=== Probando endpoint de archivos ===');
    await testFilesEndpoint();
    
    console.log('\n=== Probando endpoint de carga ===');
    await testUploadEndpoint();
}

runTests(); 