// =====================================================
// INVENTORY MODULE - CONTROLLER
// =====================================================

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  CreateWarehouseCategoryDto,
  UpdateWarehouseCategoryDto,
  CreateUnitDto,
  UpdateUnitDto,
  CreateProductDto,
  UpdateProductDto,
  CreateSupplierDto,
  UpdateSupplierDto,
  CreateStockReceiptDto,
  UpdateStockReceiptDto,
  ConfirmStockReceiptDto,
  CreateStockIssueDto,
  CreateInventoryCheckDto,
  InventoryQueryDto,
  StockReceiptQueryDto,
  StockIssueQueryDto,
  InventoryHistoryQueryDto,
  ExpiryAlertQueryDto,
  DisposeBatchDto,
} from './inventory.dto';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Inventory - Quản lý kho')
@Controller('api/inventory')
// @UseGuards(JwtAuthGuard)
// @ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ============ WAREHOUSE ENDPOINTS ============
  @Post('warehouses')
  @ApiOperation({ summary: 'Tạo kho mới' })
  @ApiResponse({ status: 201, description: 'Tạo kho thành công' })
  async createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.inventoryService.createWarehouse(dto);
  }

  @Put('warehouses/:id')
  @ApiOperation({ summary: 'Cập nhật kho' })
  async updateWarehouse(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.inventoryService.updateWarehouse(id, dto);
  }

  @Delete('warehouses/:id')
  @ApiOperation({ summary: 'Xóa kho (soft delete)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWarehouse(@Param('id') id: string) {
    return this.inventoryService.deleteWarehouse(id);
  }

  @Get('warehouses')
  @ApiOperation({ summary: 'Lấy danh sách kho' })
  async getWarehouses() {
    return this.inventoryService.getWarehouses();
  }

  @Get('warehouses/:id')
  @ApiOperation({ summary: 'Lấy chi tiết kho' })
  async getWarehouseById(@Param('id') id: string) {
    return this.inventoryService.getWarehouseById(id);
  }

  // ============ WAREHOUSE CATEGORY ENDPOINTS ============
  @Post('categories')
  @ApiOperation({ summary: 'Tạo danh mục kho' })
  async createCategory(@Body() dto: CreateWarehouseCategoryDto) {
    return this.inventoryService.createWarehouseCategory(dto);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Cập nhật danh mục kho' })
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateWarehouseCategoryDto) {
    return this.inventoryService.updateWarehouseCategory(id, dto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Lấy danh sách danh mục kho' })
  async getCategories() {
    return this.inventoryService.getWarehouseCategories();
  }

  // ============ UNIT ENDPOINTS ============
  @Post('units')
  @ApiOperation({ summary: 'Tạo đơn vị tính' })
  async createUnit(@Body() dto: CreateUnitDto) {
    return this.inventoryService.createUnit(dto);
  }

  @Put('units/:id')
  @ApiOperation({ summary: 'Cập nhật đơn vị tính' })
  async updateUnit(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.inventoryService.updateUnit(id, dto);
  }

  @Get('units')
  @ApiOperation({ summary: 'Lấy danh sách đơn vị tính' })
  async getUnits() {
    return this.inventoryService.getUnits();
  }

  // ============ PRODUCT ENDPOINTS ============
  @Post('products')
  @ApiOperation({ summary: 'Tạo sản phẩm/vật tư' })
  async createProduct(@Body() dto: CreateProductDto) {
    return this.inventoryService.createProduct(dto);
  }

  @Put('products/:id')
  @ApiOperation({ summary: 'Cập nhật sản phẩm' })
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.inventoryService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Xóa sản phẩm (soft delete)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(@Param('id') id: string) {
    return this.inventoryService.deleteProduct(id);
  }

  @Get('products')
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm' })
  async getProducts(
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    return this.inventoryService.getProducts(categoryId, search);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Lấy chi tiết sản phẩm' })
  async getProductById(@Param('id') id: string) {
    return this.inventoryService.getProductById(id);
  }

  // ============ SUPPLIER ENDPOINTS ============
  @Post('suppliers')
  @ApiOperation({ summary: 'Tạo nhà cung cấp' })
  async createSupplier(@Body() dto: CreateSupplierDto) {
    return this.inventoryService.createSupplier(dto);
  }

  @Put('suppliers/:id')
  @ApiOperation({ summary: 'Cập nhật nhà cung cấp' })
  async updateSupplier(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.inventoryService.updateSupplier(id, dto);
  }

  @Delete('suppliers/:id')
  @ApiOperation({ summary: 'Xóa nhà cung cấp (soft delete)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSupplier(@Param('id') id: string) {
    return this.inventoryService.deleteSupplier(id);
  }

  @Get('suppliers')
  @ApiOperation({ summary: 'Lấy danh sách nhà cung cấp' })
  async getSuppliers(@Query('search') search?: string) {
    return this.inventoryService.getSuppliers(search);
  }

  @Get('suppliers/:id')
  @ApiOperation({ summary: 'Lấy chi tiết nhà cung cấp' })
  async getSupplierById(@Param('id') id: string) {
    return this.inventoryService.getSupplierById(id);
  }

  @Get('suppliers/:id/debts')
  @ApiOperation({ summary: 'Lấy lịch sử công nợ nhà cung cấp' })
  async getSupplierDebtHistory(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.getSupplierDebtHistory(id, page, limit);
  }

  // ============ INVENTORY ENDPOINTS ============
  @Get('stock')
  @ApiOperation({ summary: 'Lấy danh sách tồn kho' })
  async getInventory(@Query() query: InventoryQueryDto) {
    return this.inventoryService.getInventory(query);
  }

  @Get('stock/summary')
  @ApiOperation({ summary: 'Lấy tổng hợp tồn kho' })
  async getInventorySummary() {
    return this.inventoryService.getInventorySummary();
  }

  @Get('stock/history')
  @ApiOperation({ summary: 'Lấy lịch sử xuất nhập kho' })
  async getInventoryHistory(@Query() query: InventoryHistoryQueryDto) {
    return this.inventoryService.getInventoryHistory(query);
  }

  // ============ STOCK RECEIPT ENDPOINTS ============
  @Post('receipts')
  @ApiOperation({ summary: 'Tạo phiếu nhập kho' })
  async createStockReceipt(@Body() dto: CreateStockReceiptDto, @Request() req: any) {
    return this.inventoryService.createStockReceipt(dto, req.user?.id);
  }

  @Put('receipts/:id')
  @ApiOperation({ summary: 'Cập nhật phiếu nhập kho' })
  async updateStockReceipt(@Param('id') id: string, @Body() dto: UpdateStockReceiptDto) {
    return this.inventoryService.updateStockReceipt(id, dto);
  }

  @Post('receipts/:id/confirm')
  @ApiOperation({ summary: 'Xác nhận phiếu nhập kho' })
  async confirmStockReceipt(
    @Param('id') id: string,
    @Body() dto: ConfirmStockReceiptDto,
    @Request() req: any,
  ) {
    return this.inventoryService.confirmStockReceipt(id, dto.approvedById || req.user?.id);
  }

  @Post('receipts/:id/cancel')
  @ApiOperation({ summary: 'Hủy phiếu nhập kho' })
  async cancelStockReceipt(@Param('id') id: string) {
    return this.inventoryService.cancelStockReceipt(id);
  }

  @Get('receipts')
  @ApiOperation({ summary: 'Lấy danh sách phiếu nhập kho' })
  async getStockReceipts(@Query() query: StockReceiptQueryDto) {
    return this.inventoryService.getStockReceipts(query);
  }

  @Get('receipts/:id')
  @ApiOperation({ summary: 'Lấy chi tiết phiếu nhập kho' })
  async getStockReceiptById(@Param('id') id: string) {
    return this.inventoryService.getStockReceiptById(id);
  }

  // ============ STOCK ISSUE ENDPOINTS ============
  @Post('issues')
  @ApiOperation({ summary: 'Tạo phiếu xuất kho' })
  async createStockIssue(@Body() dto: CreateStockIssueDto, @Request() req: any) {
    return this.inventoryService.createStockIssue(dto, req.user?.id);
  }

  @Post('issues/:id/confirm')
  @ApiOperation({ summary: 'Xác nhận phiếu xuất kho' })
  async confirmStockIssue(@Param('id') id: string, @Request() req: any) {
    return this.inventoryService.confirmStockIssue(id, req.user?.id);
  }

  @Post('issues/:id/cancel')
  @ApiOperation({ summary: 'Hủy phiếu xuất kho' })
  async cancelStockIssue(@Param('id') id: string) {
    return this.inventoryService.cancelStockIssue(id);
  }

  @Get('issues')
  @ApiOperation({ summary: 'Lấy danh sách phiếu xuất kho' })
  async getStockIssues(@Query() query: StockIssueQueryDto) {
    return this.inventoryService.getStockIssues(query);
  }

  @Get('issues/:id')
  @ApiOperation({ summary: 'Lấy chi tiết phiếu xuất kho' })
  async getStockIssueById(@Param('id') id: string) {
    return this.inventoryService.getStockIssueById(id);
  }

  // ============ INVENTORY CHECK ENDPOINTS ============
  @Post('checks')
  @ApiOperation({ summary: 'Tạo phiếu kiểm kê' })
  async createInventoryCheck(@Body() dto: CreateInventoryCheckDto, @Request() req: any) {
    return this.inventoryService.createInventoryCheck(dto, req.user?.id);
  }

  @Post('checks/:id/confirm')
  @ApiOperation({ summary: 'Xác nhận phiếu kiểm kê' })
  async confirmInventoryCheck(@Param('id') id: string, @Request() req: any) {
    return this.inventoryService.confirmInventoryCheck(id, req.user?.id);
  }

  // ============ EXPIRY ALERT ENDPOINTS ============
  @Get('expiry/summary')
  @ApiOperation({ summary: 'Lấy tổng hợp cảnh báo hạn sử dụng' })
  async getExpirySummary() {
    return this.inventoryService.getExpirySummary();
  }

  @Get('expiry/alerts')
  @ApiOperation({ summary: 'Lấy danh sách cảnh báo hạn sử dụng' })
  async getExpiryAlerts(@Query() query: ExpiryAlertQueryDto) {
    return this.inventoryService.getExpiryAlerts(query);
  }

  @Post('expiry/dispose')
  @ApiOperation({ summary: 'Hủy lô hàng hết hạn' })
  async disposeBatch(@Body() dto: DisposeBatchDto) {
    return this.inventoryService.disposeBatch(dto.batchId, dto.reason, dto.notes);
  }

  @Post('expiry/update-status')
  @ApiOperation({ summary: 'Cập nhật trạng thái các lô hết hạn' })
  async updateExpiredBatches() {
    return this.inventoryService.updateExpiredBatches();
  }

  @Get('batches/:inventoryId')
  @ApiOperation({ summary: 'Lấy danh sách lô hàng của inventory' })
  async getInventoryBatches(
    @Param('inventoryId') inventoryId: string,
    @Query('includeAll') includeAll?: string,
  ) {
    return this.inventoryService.getInventoryBatches(inventoryId, includeAll === 'true');
  }
}