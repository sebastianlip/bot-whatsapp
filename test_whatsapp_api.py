import requests
import json

# Configuración
TOKEN = "EAAdEtPHYbDcBOZBG8zttkY7d19j9FBngG0jj2rbISxpZCUjyYmJ4jqxRXVzB109BsqTJYhAxTuDAnzXIe0SVGh6fZAa1DEEcyjtY4v1kK7ZBuCMaSEjtgsjZAnBROSB2PU06WkG9d7ZCkSRnqynmsZCt3eKv5AwjYyy8BgCJTwrQ0poNUKrC5P8ZB99ZAhz8rMngy1XjirsMzr8c8CKEHVavR2FB0U0rLMnfk9I12leJ4QgZDZD"
PHONE_NUMBER_ID = "596710453530356"
RECIPIENT_NUMBER = "543512347050"

# URL base de la API
BASE_URL = f"https://graph.facebook.com/v22.0/{PHONE_NUMBER_ID}/messages"

# Headers para la petición
headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def send_template_message():
    """Envía un mensaje usando una plantilla"""
    try:
        # Datos del mensaje
        data = {
            "messaging_product": "whatsapp",
            "to": RECIPIENT_NUMBER,
            "type": "template",
            "template": {
                "name": "hello_world",
                "language": {
                    "code": "en_US"
                }
            }
        }

        # Enviar el mensaje
        response = requests.post(
            BASE_URL,
            headers=headers,
            json=data
        )
        
        # Verificar la respuesta
        if response.status_code == 200:
            print("¡Mensaje enviado exitosamente!")
            print("Respuesta:", response.json())
        else:
            print("Error al enviar el mensaje")
            print("Código de estado:", response.status_code)
            print("Respuesta:", response.json())
            
    except Exception as e:
        print("Ocurrió un error:", str(e))

# Ejecutar el envío del mensaje
send_template_message() 