import { ApiProperty } from '@nestjs/swagger';

export class PigDashboardStatsDto {
  @ApiProperty({ example: 1240 })
  totalPigs: number;

  @ApiProperty({ example: 18 })
  activePens: number;

  @ApiProperty({ example: 3 })
  overheatedPens: number;

  @ApiProperty({ example: 2 })
  highHumidityPens: number;

  @ApiProperty({ example: 86 })
  newPigs7Days: number;
}

export class PenItemDto {
  @ApiProperty({ example: 'uuid-123' })
  id: string;

  @ApiProperty({ example: 'Chuồng A1' })
  name: string;

  @ApiProperty({ example: 80 })
  currentPigs: number;

  @ApiProperty({ example: 100 })
  capacity: number;

  @ApiProperty({ example: 32.5 })
  temperature: number;

  @ApiProperty({ example: 78.0 })
  humidity: number;

  @ApiProperty({ example: 'warning', enum: ['normal', 'warning', 'danger'] })
  status: string;

  @ApiProperty({ example: 'Cảnh báo' })
  statusLabel: string;

  @ApiProperty({ example: 'orange' })
  color: string;
}