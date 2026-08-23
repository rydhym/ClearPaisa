import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthValidator } from './auth.validator';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { email, password, name } = AuthValidator.validateRegister(req.body);
      const result = await authService.register(email, password, name);
      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Registration failed' });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = AuthValidator.validateLogin(req.body);
      const result = await authService.login(email, password);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Login failed' });
    }
  }

  async googleLogin(req: Request, res: Response) {
    try {
      const { email, name, token } = AuthValidator.validateGoogleLogin(req.body);
      const result = await authService.googleLogin(email, name, token);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Google authentication failed' });
    }
  }
}
