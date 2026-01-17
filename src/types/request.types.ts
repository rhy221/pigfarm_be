export interface RequestWithUser {
  user?: {
    id?: string;
    [key: string]: any;
  };
  [key: string]: any;
}
