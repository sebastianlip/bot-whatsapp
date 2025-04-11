/**
 * Servicio para manejar operaciones con Amazon S3
 */
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, AWS_CONFIG } = require('../../config/aws');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

/**
 * Sube un archivo al bucket de S3
 * @param {Buffer|Readable} fileContent - Contenido del archivo
 * @param {string} fileName - Nombre del archivo
 * @param {string} mimeType - Tipo MIME del archivo
 * @param {string} folder - Carpeta donde se guardará (opcional)
 * @returns {Promise<string>} - URL del archivo subido
 */
async function uploadFile(fileContent, fileName, mimeType, folder = '') {
    // Generar una clave única para el archivo
    const timestamp = Date.now();
    const key = folder 
        ? `${folder}/${timestamp}-${fileName}`
        : `${timestamp}-${fileName}`;
    
    try {
        // Configurar el comando para subir el archivo
        const command = new PutObjectCommand({
            Bucket: AWS_CONFIG.S3_BUCKET_NAME,
            Key: key,
            Body: fileContent,
            ContentType: mimeType
        });
        
        // Ejecutar el comando
        await s3Client.send(command);
        
        // Construir la URL del archivo (esto dependerá de tu configuración)
        const fileUrl = `https://${AWS_CONFIG.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
        console.log(`Archivo subido exitosamente a S3: ${fileUrl}`);
        
        return {
            key,
            fileUrl
        };
    } catch (error) {
        console.error('Error al subir archivo a S3:', error);
        throw error;
    }
}

/**
 * Sube un archivo desde una ruta local al bucket de S3
 * @param {string} filePath - Ruta local del archivo
 * @param {string} mimeType - Tipo MIME del archivo
 * @param {string} folder - Carpeta donde se guardará (opcional)
 * @returns {Promise<string>} - URL del archivo subido
 */
async function uploadFileFromPath(filePath, mimeType, folder = '') {
    try {
        const fileContent = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);
        return await uploadFile(fileContent, fileName, mimeType, folder);
    } catch (error) {
        console.error('Error al leer y subir archivo a S3:', error);
        throw error;
    }
}

module.exports = {
    uploadFile,
    uploadFileFromPath
}; 