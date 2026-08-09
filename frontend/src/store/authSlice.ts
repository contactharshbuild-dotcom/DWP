import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  batch?: string | null;
  profile_url?: string | null;
  profileUrl?: string | null;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  status: string;
  logo_url?: string | null;
  logoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  subscription_plan_id?: number | null;
  subscriptionPlan?: any;
  billing_cycle?: string | null;
  subscription_status?: string | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  organization: Organization | null;
  loading: boolean;
  error: string | null;
}

// Check localStorage for existing session
const token = localStorage.getItem('token');
const userJson = localStorage.getItem('user');
const organizationJson = localStorage.getItem('organization');

const initialState: AuthState = {
  token: token || null,
  user: userJson ? JSON.parse(userJson) : null,
  organization: organizationJson ? JSON.parse(organizationJson) : null,
  loading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
    setCredentials(
      state,
      action: PayloadAction<{ token: string; user: User; organization: Organization }>
    ) {
      const { token, user, organization } = action.payload;
      state.token = token;
      state.user = user;
      state.organization = organization;
      state.loading = false;
      state.error = null;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('organization', JSON.stringify(organization));
    },
    updateOrganization(state, action: PayloadAction<Partial<Organization>>) {
      if (state.organization) {
        state.organization = { ...state.organization, ...action.payload };
        localStorage.setItem('organization', JSON.stringify(state.organization));
      }
    },
    updateUserProfile(state, action: PayloadAction<Partial<User>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    logout(state) {
      state.token = null;
      state.user = null;
      state.organization = null;
      state.loading = false;
      state.error = null;

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('organization');
    }
  }
});

export const { 
  setLoading, 
  setError, 
  setCredentials, 
  updateOrganization, 
  updateUserProfile, 
  logout 
} = authSlice.actions;

export default authSlice.reducer;
