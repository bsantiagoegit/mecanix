export interface Role {
  code: string;
  name: string;
  description: string;
}

export interface CatalogsState {
  roles: Role[];
  isLoading: boolean;
  error: string | null;
}

export const initialCatalogsState: CatalogsState = {
  roles: [],
  isLoading: false,
  error: null,
};
