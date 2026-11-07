export interface Workshop {
  id: string;
  name: string;
  address: string;
  phone: string;
  logoUrl: string | null;
  capacity: number;
  minIntakePhotos: number;
  quoteExpirationDays: number;
  warrantyDays: number;
  currency: string;
  timezone: string;
}
