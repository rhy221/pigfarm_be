export class CreateWorkShiftDto {
  session: string;
  start_time: string;
  end_time: string;
}

export class UpdateWorkShiftDto {
  session?: string;
  start_time?: string;
  end_time?: string;
}