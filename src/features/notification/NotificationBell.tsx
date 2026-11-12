"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useSession } from "@/components/auth/SessionProvider";
import { useApiResource } from "@/lib/api/use-api-resource";
import { notificationService } from "./services/notification.service";

export function NotificationBell({ href, portal = false }: { href: string; portal?: boolean }) {
  const { user } = useSession();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const resource = useApiResource(user?.id ? `notifications:bell:${user.id}` : null, async (signal) => {
    const [latest, unread] = await Promise.all([
      notificationService.getNotifications(1, 5, undefined, signal),
      notificationService.getNotifications(1, 1, false, signal),
    ]);
    return { latest: latest.items, unreadCount: unread.pagination.totalCount };
  });

  if (!user) return null;

  async function markRead(id: string) {
    setBusyId(id);
    try {
      await notificationService.markAsRead(id);
      setActionError("");
      resource.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không cập nhật được thông báo.");
    } finally {
      setBusyId(null);
    }
  }

  const count = resource.data?.unreadCount ?? 0;
  return (
    <details className={`notification-bell${portal ? " notification-bell-portal" : ""}`}
      onToggle={(event) => { if (event.currentTarget.open) resource.reload(); }}>
      <summary aria-label={count ? `Thông báo, ${count} chưa đọc` : "Thông báo"}>
        <Icon name="bell" size={20} />
        {portal && <span>Thông báo</span>}
        {count > 0 && <span className="notification-count">{count > 99 ? "99+" : count}</span>}
      </summary>
      <div className="notification-popover">
        <div className="notification-popover-heading"><strong>Thông báo</strong><Link href={href}>Xem tất cả</Link></div>
        {resource.error && <p role="alert">Không tải được thông báo. <button type="button" onClick={resource.reload}>Thử lại</button></p>}
        {actionError && <p role="alert">{actionError}</p>}
        {resource.loading && <p role="status">Đang tải thông báo…</p>}
        {!resource.loading && !resource.error && !resource.data?.latest.length && <p>Chưa có thông báo.</p>}
        {!!resource.data?.latest.length && <ul className="notification-preview-list">
          {resource.data.latest.map((item) => <li key={item.id} className={item.isRead ? "" : "notification-unread"}>
            <strong>{item.title || "Thông báo Nexus"}</strong>
            <p>{item.body || "Bạn có thông báo mới."}</p>
            {!item.isRead && <button type="button" disabled={busyId === item.id}
              onClick={() => void markRead(item.id)}>Đánh dấu đã đọc</button>}
          </li>)}
        </ul>}
      </div>
    </details>
  );
}
