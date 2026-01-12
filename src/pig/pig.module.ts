import { Module } from '@nestjs/common';
import { PigController } from './pig.controller';
import { PigService } from './pig.service';

@Module({
  controllers: [PigController],
  providers: [PigService],
})
export class PigModule {}
