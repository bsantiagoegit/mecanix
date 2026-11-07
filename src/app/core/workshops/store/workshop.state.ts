import { Workshop } from '../workshop.model';

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
