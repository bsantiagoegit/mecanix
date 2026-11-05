export interface CatalogRole {
  code: string;
  name: string;
  description: string;
}

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
