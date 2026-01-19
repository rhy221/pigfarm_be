import { Test, TestingModule } from '@nestjs/testing';
import { PigController } from './pig.controller';
import { PigService } from './pig.service';

describe('PigController', () => {
  let controller: PigController;

  const mockPigService = {
    findByPen: jest.fn(id => [{ id, ear_tag_number: 'HEO01' }]),
    getExportProposals: jest.fn(() => []),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PigController],
      providers: [
        {
          provide: PigService,
          useValue: mockPigService,
        },
      ],
    }).compile();

    controller = module.get<PigController>(PigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});