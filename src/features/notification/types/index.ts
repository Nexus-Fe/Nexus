export type NotificationItem = {
  id: string;
  title: string | null;
  body: string | null;
  notificationType: string | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationPage = {
  items: NotificationItem[];
  pagination: {
    pageIndex: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
  };
};
