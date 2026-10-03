import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private readonly logger = new Logger(AuthController.name);

  @Post('login')
  async login(@Body() body: { username?: string; password?: string }) {
    if (!body || !body.username || !body.password) {
      throw new BadRequestException('Username and password are required.');
    }
    try {
      return await this.authService.login(body.username, body.password);
    } catch (err: any) {
      this.logger.error(
        `Login error for user "${body?.username}": ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }
}
