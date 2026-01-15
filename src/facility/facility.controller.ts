import { Controller, Get } from '@nestjs/common';
import { FacilityService } from './facility.service';

@Controller('facility')
export class FacilityController {
  constructor(private readonly facilityService: FacilityService) {}

  @Get('pens/grouped-by-breed')
  getPensGroupedByBreed() {
    return this.facilityService.getPensGroupedByBreed();
  }
}