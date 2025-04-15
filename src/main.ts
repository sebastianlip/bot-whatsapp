import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { Amplify } from 'aws-amplify';
import { environment } from './environments/environment';

// Configurar AWS Amplify
Amplify.configure({
  Auth: {
    region: environment.cognito.region,
    userPoolId: environment.cognito.userPoolId,
    userPoolWebClientId: environment.cognito.clientId,
    oauth: {
      domain: environment.cognito.domain,
      scope: ['email', 'profile', 'openid'],
      redirectSignIn: environment.cognito.redirectUri,
      redirectSignOut: environment.cognito.logoutUri,
      responseType: 'code'
    }
  }
});

console.log('AWS Amplify configurado correctamente en main.ts');

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err)); 