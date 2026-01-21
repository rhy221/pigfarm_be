import { Module } from '@nestjs/common';
import { FeedingService } from './feeding.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FeedingService],
})
export class FeedingModule {}
