import { Body, Controller, Delete, Get, Param, Post, Query, Put } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery, ApiBody } from '@nestjs/swagger';
import { FeedingService, } from './feeding.service';
import { 
  CreateFeedingFormulaDto, 
  FeedingFormulaResponseDto, // Import cái mới
  FeedingPlanResponseDto,
  UpdateFeedingFormulaDto
} from './feeding.dto';

@ApiTags('Feeding Management')
@Controller('feeding')
export class FeedingController {
  constructor(private readonly feedingService: FeedingService) {}


  @Post('formulas')
  @ApiOperation({ summary: 'Tạo công thức/định mức cho ăn mới' })
  @ApiBody({ type: CreateFeedingFormulaDto }) 
  @ApiResponse({ 
    status: 201, 
    description: 'Tạo thành công', 
    type: FeedingFormulaResponseDto 
  })
  createFormula(@Body() body: CreateFeedingFormulaDto) {
    return this.feedingService.createFormula(body);
  }

  @Get('formulas')
  @ApiOperation({ summary: 'Lấy danh sách tất cả công thức (cho bảng Điều chỉnh)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách công thức', 
    type: [FeedingFormulaResponseDto] 
  })
  getFormulas() {
    return this.feedingService.getFormulas();
  }

  @Delete('formulas/:id')
  @ApiOperation({ summary: 'Xóa công thức' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  deleteFormula(@Param('id') id: string) {
    return this.feedingService.deleteFormula(id);
  }


  @Get('plan')
  @ApiOperation({ summary: 'Lấy kế hoạch cho ăn theo Lứa Heo (có Timeline & Tính toán)' })
  @ApiQuery({ name: 'batchId', type: String, description: 'ID của Lứa heo (Pig Batch)' })
  @ApiQuery({ name: 'stageId', type: String, required: false, description: 'ID giai đoạn (nếu chọn)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dữ liệu timeline và bảng tính toán',
    type: FeedingPlanResponseDto 
  })
  getPlan(
    @Query('batchId') batchId: string,
    @Query('stageId') stageId?: string
  ) {
    return this.feedingService.getFeedingPlan(batchId, stageId);
  }

  @Put('formulas/:id')
  @ApiOperation({ summary: 'Cập nhật công thức và thành phần' })
  @ApiBody({ type: UpdateFeedingFormulaDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Cập nhật thành công',
    type: FeedingFormulaResponseDto 
  })
  updateFormula(
    @Param('id') id: string, 
    @Body() body: UpdateFeedingFormulaDto
  ) {
    return this.feedingService.updateFormula(id, body);
  }
}