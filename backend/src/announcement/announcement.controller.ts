import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from './dto/create-announcement.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientOriginGuard } from '../common/guards/client-origin.guard';

@Controller('api/announcements')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  // Public endpoint for active ticker announcements
  @UseGuards(ClientOriginGuard)
  @Get('active')
  getActiveAnnouncements() {
    return this.announcementService.getActive();
  }

  // Admin CRUD Endpoints
  @UseGuards(JwtAuthGuard)
  @Get()
  getAllAnnouncements() {
    return this.announcementService.getAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getAnnouncementById(@Param('id') id: string) {
    return this.announcementService.getById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  createAnnouncement(@Body() body: CreateAnnouncementDto) {
    return this.announcementService.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  updateAnnouncement(
    @Param('id') id: string,
    @Body() body: UpdateAnnouncementDto,
  ) {
    return this.announcementService.update(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deleteAnnouncement(@Param('id') id: string) {
    return this.announcementService.delete(id);
  }
}
