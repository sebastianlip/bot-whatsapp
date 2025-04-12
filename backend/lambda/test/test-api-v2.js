const fetch = require('node-fetch');

// URL del endpoint de API Gateway
const API_URL = 'https://0wf1nv2l1k.execute-api.us-east-2.amazonaws.com/v1';

// Datos de prueba con campos básicos
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
    console.log('=== INTENTANDO NUEVA ESTRATEGIA DE PRUEBA ===');
    console.log('Enviando solicitud a:', `${API_URL}/upload`);
    
    // Registrar la estructura exacta que enviamos
    const payload = JSON.stringify(testData);
    console.log('Payload como string (primeros 100 caracteres):', payload.substring(0, 100));
    console.log('Longitud total del payload:', payload.length);

    try {
        // Configuración de la solicitud con timeouts más largos
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: payload,
            timeout: 10000 // Timeout de 10 segundos
        });

        console.log('Código de estado:', response.status);
        console.log('Headers de respuesta:', response.headers);
        
        // Intentar obtener la respuesta como texto primero
        const textResponse = await response.text();
        console.log('Respuesta en texto plano:', textResponse);
        
        // Luego intentar parsearlo como JSON si es posible
        try {
            const jsonData = JSON.parse(textResponse);
            console.log('Respuesta parseada como JSON:', jsonData);
            
            // Si hay un body en la respuesta JSON, intentar extraerlo
            if (jsonData.body && typeof jsonData.body === 'string') {
                try {
                    const innerBody = JSON.parse(jsonData.body);
                    console.log('Contenido del body:', innerBody);
                } catch (e) {
                    console.log('No se pudo parsear el body como JSON:', jsonData.body);
                }
            }
        } catch (jsonError) {
            console.log('No se pudo parsear la respuesta como JSON:', jsonError.message);
        }
    } catch (error) {
        console.error('Error al enviar la solicitud:', error);
    }
}

// Función para probar directamente con curl para comparar
async function testWithCurl() {
    const { exec } = require('child_process');
    
    console.log('\n=== PROBANDO CON CURL PARA COMPARAR ===');
    
    const command = `curl -X POST ${API_URL}/upload -H "Content-Type: application/json" -d "${JSON.stringify(testData).replace(/"/g, '\\"')}"`;
    console.log('Comando curl:', command);
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error('Error ejecutando curl:', error);
            return;
        }
        if (stderr) {
            console.error('Stderr de curl:', stderr);
        }
        console.log('Respuesta de curl:', stdout);
    });
}

// Ejecutar las pruebas
async function runTests() {
    await testUploadEndpoint();
    await testWithCurl();
}

runTests(); 