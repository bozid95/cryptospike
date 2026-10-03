export class CreateAnnouncementDto {
  title?: string;
  message?: string;
  icon?: string;
  linkText?: string;
  linkUrl?: string;
  isActive?: boolean;
}

export class UpdateAnnouncementDto {
  title?: string;
  message?: string;
  icon?: string;
  linkText?: string;
  linkUrl?: string;
  isActive?: boolean;
}
