import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateTemplateDto } from './dto/create-template.dto';
import { ListTemplatesQueryDto } from './dto/list-templates-query.dto';
import { TemplatesService } from './templates.service';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateTemplateDto) {
    return this.templatesService.create(user.sub, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtUser, @Query() query: ListTemplatesQueryDto) {
    return this.templatesService.list(user.sub, query);
  }
}
