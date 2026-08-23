import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../shared/utils/db';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyclearpa1sa';

export class AuthService {
  async register(email: string, passwordHash: string, name?: string) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(passwordHash, salt);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        name,
        role: 'USER',
      },
    });

    const token = this.generateToken(user.id, user.email, user.role);
    return { user: { id: user.id, email: user.email, name: user.name }, token };
  }

  async login(email: string, passwordHash: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(passwordHash, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const token = this.generateToken(user.id, user.email, user.role);
    return { user: { id: user.id, email: user.email, name: user.name }, token };
  }

  async googleLogin(email: string, name: string, googleToken: string) {
    // In a real implementation, we would verify googleToken using OAuth2Client
    // For this design/sandbox, we will assume it is valid and extract the info.
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          role: 'USER',
        },
      });
    }

    // Save mock consent token details for Gmail
    await prisma.consent.upsert({
      where: { consentId: `google_oauth_${user.id}` },
      update: {
        status: 'ACTIVE',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        rawConsentData: { token: googleToken },
      },
      create: {
        userId: user.id,
        provider: 'GOOGLE_GMAIL',
        consentId: `google_oauth_${user.id}`,
        status: 'ACTIVE',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        frequency: 'DAILY',
        rawConsentData: { token: googleToken },
      },
    });

    const token = this.generateToken(user.id, user.email, user.role);
    return { user: { id: user.id, email: user.email, name: user.name }, token };
  }

  private generateToken(id: string, email: string, role: string): string {
    return jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: '7d' });
  }
}
