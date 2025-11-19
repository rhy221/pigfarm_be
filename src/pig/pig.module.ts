import { Module } from '@nestjs/common';
import { PigController } from './pig.controller';
import { PigService } from './pig.service';
import { PigService } from './pig.service';
import { PigController } from './pig.controller';

@Module({
  controllers: [PigController],
  providers: [PigService]
})
export class PigModule {}
