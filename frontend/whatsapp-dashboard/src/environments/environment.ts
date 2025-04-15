export const environment = {
  production: false,
  apiUrl: 'https://0wf1nv2l1k.execute-api.us-east-2.amazonaws.com/v1',
  cognito: {
    userPoolId: 'us-east-2_QX51TFH9O',
    clientId: '1gi3ffh237kmtejjt9cn132fk4',
    region: 'us-east-2',
    identityPoolId: '',
    domain: 'whatsapp-dashboard-testeando.auth.us-east-2.amazoncognito.com',
    redirectUri: 'http://localhost:4208/auth/callback',
    logoutUri: 'http://localhost:4208/login'
  }
}; 