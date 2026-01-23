import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FeedingService } from './feeding.service';
import { CreateFeedingFormulaDto, UpdateFeedingFormulaDto } from './feeding.dto';

@ApiTags('Feeding') // Tag này giúp gom nhóm API trong Swagger
@Controller('feeding')
export class FeedingController {
  constructor(private readonly feedingService: FeedingService) {}

  @Post('formula')
  @ApiOperation({ summary: 'Tạo công thức cho ăn mới' })
  createFormula(@Body() data: CreateFeedingFormulaDto) {
    return this.feedingService.createFormula(data);
  }

  @Get('formulas')
  @ApiOperation({ summary: 'Lấy danh sách công thức' })
  getFormulas() {
    return this.feedingService.getFormulas();
  }

  @Put('formula/:id')
  @ApiOperation({ summary: 'Cập nhật công thức' })
  updateFormula(@Param('id') id: string, @Body() data: UpdateFeedingFormulaDto) {
    return this.feedingService.updateFormula(id, data);
  }

  @Delete('formula/:id')
  @ApiOperation({ summary: 'Xóa công thức' })
  deleteFormula(@Param('id') id: string) {
    return this.feedingService.deleteFormula(id);
  }

  @Get('plan/:batchId')
  @ApiOperation({ summary: 'Tính toán lịch cho ăn theo lứa heo (Batch ID) và giai đoạn (Stage)' })
  getFeedingPlan(
    @Param('batchId') batchId: string, 
    @Query('stage') stage?: number
  ) {
    return this.feedingService.getFeedingPlan(batchId, stage);
  }
}