import { Module } from '@nestjs/common';
import { FeedingService } from './feeding.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FeedingController } from './feeding.controller'; 

@Module({
  imports: [PrismaModule],
  controllers: [FeedingController], 
  providers: [FeedingService],
})
export class FeedingModule {}
