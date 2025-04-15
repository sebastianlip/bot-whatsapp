export interface UserData {
  username: string;
  isAuthenticated: boolean;
  attributes?: {
    email?: string;
    [key: string]: any;
  };
  token?: string;
  phoneNumbers?: string[]; // Números de teléfono asociados al usuario
}

export interface CognitoUser {
  username: string;
  signInUserSession?: {
    idToken?: {
      jwtToken?: string;
    };
  };
  attributes?: {
    email?: string;
    [key: string]: any;
  };
  signInDetails?: {
    loginId?: string;
  };
} 