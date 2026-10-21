export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  fullName: string;
};

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};
