// =====================================================
// FINANCE MODULE - CONTROLLER
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
  Request,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { ResponseTransformInterceptor } from '../lib/response-transform.interceptor';
import {
  CreateTransactionCategoryDto,
  UpdateTransactionCategoryDto,
  CreateCashAccountDto,
  UpdateCashAccountDto,
  CreateTransactionDto,
  UpdateTransactionDto,
  CreateSupplierPaymentDto,
  CreateMonthlyBillDto,
  UpdateMonthlyBillDto,
  CreateMonthlyBillRecordDto,
  PayMonthlyBillDto,
  PayBillDirectDto,
  CreateCustomerDto,
  UpdateCustomerDto,
  TransactionQueryDto,
  CashBookReportDto,
  FinancialSummaryDto,
  MonthlyBillQueryDto,
  TransactionType,
} from './finance.dto';
@ApiTags('Finance - Quản lý chi phí / Sổ quỹ')
@Controller('api/finance')
@UseInterceptors(ResponseTransformInterceptor)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ============ TRANSACTION CATEGORY ENDPOINTS ============
  @Post('categories')
  @ApiOperation({ summary: 'Tạo danh mục thu chi' })
  async createCategory(@Body() dto: CreateTransactionCategoryDto) {
    return this.financeService.createTransactionCategory(dto);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Cập nhật danh mục thu chi' })
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateTransactionCategoryDto) {
    return this.financeService.updateTransactionCategory(id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Xóa danh mục thu chi' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@Param('id') id: string) {
    return this.financeService.deleteTransactionCategory(id);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Lấy danh sách danh mục thu chi' })
  async getCategories(
    @Query('type') type?: TransactionType,
  ) {
    return this.financeService.getTransactionCategories( type);
  }

  // ============ CASH ACCOUNT ENDPOINTS ============
  @Post('accounts')
  @ApiOperation({ summary: 'Tạo tài khoản quỹ' })
  async createCashAccount(@Body() dto: CreateCashAccountDto) {
    return this.financeService.createCashAccount(dto);
  }

  @Put('accounts/:id')
  @ApiOperation({ summary: 'Cập nhật tài khoản quỹ' })
  async updateCashAccount(@Param('id') id: string, @Body() dto: UpdateCashAccountDto) {
    return this.financeService.updateCashAccount(id, dto);
  }

  @Delete('accounts/:id')
  @ApiOperation({ summary: 'Xóa tài khoản quỹ' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCashAccount(@Param('id') id: string) {
    return this.financeService.deleteCashAccount(id);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Lấy danh sách tài khoản quỹ' })
  async getCashAccounts() {
    return this.financeService.getCashAccounts();
  }

  @Get('accounts/:id')
  @ApiOperation({ summary: 'Lấy chi tiết tài khoản quỹ' })
  async getCashAccountById(@Param('id') id: string) {
    return this.financeService.getCashAccountById(id);
  }

  @Get('accounts/balances')
  @ApiOperation({ summary: 'Lấy số dư các tài khoản' })
  async getCashAccountBalances() {
    return this.financeService.getCashAccountBalances();
  }

  // ============ TRANSACTION ENDPOINTS ============
  @Post('transactions')
  @ApiOperation({ summary: 'Tạo phiếu thu/chi' })
  async createTransaction(@Body() dto: CreateTransactionDto, @Request() req: any) {
    return this.financeService.createTransaction(dto, req.user?.id);
  }

  @Put('transactions/:id')
  @ApiOperation({ summary: 'Cập nhật phiếu thu/chi' })
  async updateTransaction(@Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.financeService.updateTransaction(id, dto);
  }

  @Delete('transactions/:id')
  @ApiOperation({ summary: 'Xóa phiếu thu/chi' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTransaction(@Param('id') id: string) {
    return this.financeService.deleteTransaction(id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Lấy danh sách phiếu thu/chi' })
  async getTransactions(@Query() query: TransactionQueryDto) {
    return this.financeService.getTransactions(query);
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Lấy chi tiết phiếu thu/chi' })
  async getTransactionById(@Param('id') id: string) {
    return this.financeService.getTransactionById(id);
  }

  // ============ SUPPLIER PAYMENT ENDPOINTS ============
  @Post('supplier-payments')
  @ApiOperation({ summary: 'Thanh toán công nợ nhà cung cấp' })
  async createSupplierPayment(@Body() dto: CreateSupplierPaymentDto, @Request() req: any) {
    return this.financeService.createSupplierPayment(dto, req.user?.id);
  }

  // ============ REPORT ENDPOINTS ============
  @Get('reports/cash-book')
  @ApiOperation({ summary: 'Báo cáo sổ quỹ' })
  async getCashBookReport(@Query() dto: CashBookReportDto) {
    return this.financeService.getCashBookReport(dto);
  }

  @Get('reports/summary')
  @ApiOperation({ summary: 'Báo cáo tổng hợp tài chính' })
  async getFinancialSummary(@Query() dto: FinancialSummaryDto) {
    return this.financeService.getFinancialSummary(dto);
  }

  @Get('reports/dashboard')
  @ApiOperation({ summary: 'Thống kê tài chính cho dashboard' })
  async getDashboardStats() {
    return this.financeService.getDashboardStats();
  }

  // ============ MONTHLY BILL ENDPOINTS ============
  @Post('monthly-bills')
  @ApiOperation({ summary: 'Tạo hóa đơn tháng' })
  async createMonthlyBill(@Body() dto: CreateMonthlyBillDto) {
    return this.financeService.createMonthlyBill(dto);
  }

  @Put('monthly-bills/:id')
  @ApiOperation({ summary: 'Cập nhật hóa đơn tháng' })
  async updateMonthlyBill(@Param('id') id: string, @Body() dto: UpdateMonthlyBillDto) {
    return this.financeService.updateMonthlyBill(id, dto);
  }

  @Delete('monthly-bills/:id')
  @ApiOperation({ summary: 'Xóa hóa đơn tháng' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMonthlyBill(@Param('id') id: string) {
    return this.financeService.deleteMonthlyBill(id);
  }

  @Get('monthly-bills')
  @ApiOperation({ summary: 'Lấy danh sách hóa đơn tháng' })
  async getMonthlyBills() {
    return this.financeService.getMonthlyBills();
  }

  @Post('monthly-bills/records')
  @ApiOperation({ summary: 'Tạo bản ghi hóa đơn tháng' })
  async createMonthlyBillRecord(@Body() dto: CreateMonthlyBillRecordDto) {
    return this.financeService.createMonthlyBillRecord(dto);
  }

  @Post('monthly-bills/pay')
  @ApiOperation({ summary: 'Thanh toán hóa đơn tháng (theo recordId)' })
  async payMonthlyBill(@Body() dto: PayMonthlyBillDto, @Request() req: any) {
    return this.financeService.payMonthlyBill(dto, req.user?.id);
  }

  @Post('monthly-bills/pay-direct')
  @ApiOperation({ summary: 'Thanh toán trực tiếp hóa đơn (tự động tạo record)' })
  async payBillDirect(@Body() dto: PayBillDirectDto, @Request() req: any) {
    return this.financeService.payBillDirect(dto, req.user?.id);
  }

  @Get('monthly-bills/records')
  @ApiOperation({ summary: 'Lấy danh sách bản ghi hóa đơn' })
  async getMonthlyBillRecords(@Query() query: MonthlyBillQueryDto) {
    return this.financeService.getMonthlyBillRecords(query);
  }

  // ============ CUSTOMER ENDPOINTS ============
  @Post('customers')
  @ApiOperation({ summary: 'Tạo khách hàng' })
  async createCustomer(@Body() dto: CreateCustomerDto) {
    return this.financeService.createCustomer(dto);
  }

  @Put('customers/:id')
  @ApiOperation({ summary: 'Cập nhật khách hàng' })
  async updateCustomer(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.financeService.updateCustomer(id, dto);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Lấy danh sách khách hàng' })
  async getCustomers(@Query('search') search?: string) {
    return this.financeService.getCustomers( search);
  }
}