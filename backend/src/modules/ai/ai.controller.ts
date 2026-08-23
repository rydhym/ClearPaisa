import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth';
import { AIService } from './ai.service';

const aiService = new AIService();

export class AIController {
  async ask(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { question } = req.body;
      if (!question) {
        return res.status(400).json({ error: 'Question is required' });
      }

      const answer = await aiService.askAssistant(userId, question);
      return res.status(200).json({ answer });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'AI assistant query failed' });
    }
  }
}
