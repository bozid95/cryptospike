import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    // Buat default admin user jika belum ada akun sama sekali
    await this.ensureDefaultAdmin();
  }

  private async ensureDefaultAdmin() {
    try {
      const rawUser = process.env.ADMIN_USERNAME?.trim();
      const rawPass = process.env.ADMIN_PASSWORD?.trim();
      const adminUsername =
        rawUser && rawUser.length > 0 ? rawUser : 'cspk_operator_9x';
      const adminPassword =
        rawPass && rawPass.length > 0 ? rawPass : 'Kx9#mQ2$vL8@wP5!Zt7&';

      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [{ role: 'admin' }, { username: adminUsername }],
        },
      });

      if (!existingUser) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(adminPassword, salt);
        await this.prisma.user.create({
          data: {
            username: adminUsername,
            passwordSalt: salt,
            passwordHash: hash,
            role: 'admin',
            isActive: true,
          },
        });
        this.logger.log(
          `[AUTH INIT] Default admin user initialized: username="${adminUsername}"`,
        );
      } else {
        // User admin sudah ada di DB; jangan timpa password atau data yang sudah ada
        this.logger.log(
          `[AUTH INIT] Existing admin user retained in DB: username="${existingUser.username}"`,
        );
      }
    } catch (err: any) {
      this.logger.warn(`Could not initialize admin user: ${err.message}`);
    }
  }

  async login(username: string, pass: string) {
    this.logger.log(`[AUTH LOGIN ATTEMPT] Username="${username}"`);
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      this.logger.warn(`[AUTH FAILED] User not found: "${username}"`);
      throw new UnauthorizedException('Username tidak ditemukan.');
    }

    if (!user.isActive) {
      this.logger.warn(`[AUTH FAILED] User is inactive: "${username}"`);
      throw new UnauthorizedException('Akun dinonaktifkan.');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      this.logger.warn(`[AUTH FAILED] Password mismatch for: "${username}"`);
      throw new UnauthorizedException('Password salah.');
    }

    this.logger.log(`[AUTH SUCCESS] User logged in: "${username}"`);
    const payload = { sub: user.id, username: user.username, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      success: true,
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true, createdAt: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
