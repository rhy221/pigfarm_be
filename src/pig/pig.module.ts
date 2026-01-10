import { Module } from '@nestjs/common';

import { PigService } from './pig.service';
import { PigController } from './pig.controller';

@Module({
  controllers: [PigController],
  providers: [PigService]
})
export class PigModule {}
