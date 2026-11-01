export type LoginRequest = {
  identifier: string;
  password: string;
};

export type RegisterRequest = {
  username?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
};

export type AuthUser = {
  id: string;
  email: string;
  username?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  roles?: string[];
  permissions?: string[];
  reputationScore?: number;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
  userId?: string;
  roles?: string[];
  user: AuthUser;
};
