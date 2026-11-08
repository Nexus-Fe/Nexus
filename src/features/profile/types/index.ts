export type UserProfile = {
  id: string;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  phoneNumber: string | null;
  address: string | null;
  avatarUrl: string | null;
  status: string;
  roles: string[];
  permissions: string[];
  isSeller: boolean;
  shopName: string | null;
  reputationScore: number;
  trustLevel: string;
  createdAt: string;
};

export type UpdateUserProfile = {
  username?: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
};
