import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Organization {
  id: number;
  name: string;
  slug: string;
  status: string;
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

export const { setLoading, setError, setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
