import { Test, TestingModule } from '@nestjs/testing';
import { PigService } from './pig.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PigService', () => {
  let service: PigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PigService, PrismaService],
    }).compile();

    service = module.get<PigService>(PigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});