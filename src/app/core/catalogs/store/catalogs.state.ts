import { CatalogRole } from '../catalogs.model';

export interface CatalogsState {
  roles: CatalogRole[];
  isLoading: boolean;
  error: string | null;
}

export const initialCatalogsState: CatalogsState = {
  roles: [],
  isLoading: false,
  error: null,
};
