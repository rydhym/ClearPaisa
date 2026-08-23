export class AuthValidator {
  static validateRegister(reqBody: any) {
    const { email, password, name } = reqBody;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new Error('A valid email address is required');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    return { email, password, name: name || '' };
  }

  static validateLogin(reqBody: any) {
    const { email, password } = reqBody;
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      throw new Error('Email and password are required');
    }
    return { email, password };
  }

  static validateGoogleLogin(reqBody: any) {
    const { email, name, token } = reqBody;
    if (!email || typeof email !== 'string' || !token || typeof token !== 'string') {
      throw new Error('Google email and credential token are required');
    }
    return { email, name: name || '', token };
  }
}
