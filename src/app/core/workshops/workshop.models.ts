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

export interface WorkshopState {
  available: Workshop[];
  active: Workshop | null;
  isLoading: boolean;
  error: string | null;
}

export const initialWorkshopState: WorkshopState = {
  available: [],
  active: null,
  isLoading: false,
  error: null,
};
