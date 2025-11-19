import { Test, TestingModule } from '@nestjs/testing';
import { PigController } from './pig.controller';

describe('PigController', () => {
  let controller: PigController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PigController],
    }).compile();

    controller = module.get<PigController>(PigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
