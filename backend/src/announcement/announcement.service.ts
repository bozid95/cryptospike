import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from './dto/create-announcement.dto';

@Injectable()
export class AnnouncementService implements OnModuleInit {
  private readonly logger = new Logger(AnnouncementService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedInitialAnnouncementIfNeeded();
  }

  private async seedInitialAnnouncementIfNeeded() {
    try {
      const count = await this.prisma.announcement.count();
      if (count === 0) {
        await this.prisma.announcement.create({
          data: {
            title: 'Development Phase & Sample Data Testing',
            message:
              'The system is currently in development & collecting sample signals for algorithm strategy testing. These signals are purely for technical evaluation, not financial advice, and do not follow them.',
            icon: 'AlertTriangle',
            isActive: true,
          },
        });
        this.logger.log('Seeded initial disclaimer announcement.');
      }
    } catch (err: any) {
      this.logger.warn(`Failed to seed default announcement: ${err.message}`);
    }
  }

  async getActive() {
    return this.prisma.announcement.findMany({
      where: { isActive: true },
    });
  }

  async getAll() {
    return this.prisma.announcement.findMany({
      orderBy: { id: 'desc' },
    });
  }

  async getById(id: string) {
    return this.prisma.announcement.findUnique({
      where: { id },
    });
  }

  async create(dto: CreateAnnouncementDto) {
    return this.prisma.announcement.create({
      data: {
        title: dto.title ?? null,
        message: dto.message ?? null,
        icon: dto.icon ?? 'AlertTriangle',
        linkText: dto.linkText ?? null,
        linkUrl: dto.linkUrl ?? null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    return this.prisma.announcement.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.message !== undefined && { message: dto.message }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.linkText !== undefined && { linkText: dto.linkText }),
        ...(dto.linkUrl !== undefined && { linkUrl: dto.linkUrl }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async delete(id: string) {
    return this.prisma.announcement.delete({
      where: { id },
    });
  }
}
