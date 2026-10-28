export type IconName =
  | "home" | "grid" | "gavel" | "bag" | "orders" | "wallet"
  | "warehouse" | "users" | "flag" | "shield" | "search"
  | "arrow" | "chevron" | "chevronDown" | "user" | "check" | "clock" | "truck" | "plus";

const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-7h6v7"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  gavel: <><path d="m14 4 6 6M12 6l6 6M3 21h13M13 11l-8 8M9 3l7 7"/></>,
  bag: <><path d="M4 8h16l-1 13H5L4 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
  orders: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
  wallet: <><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 9V5a2 2 0 0 1 2-2h14"/><path d="M16 14h5v4h-5a2 2 0 0 1 0-4Z"/></>,
  warehouse: <><path d="m3 9 9-6 9 6v12H3V9Z"/><path d="M7 21v-9h10v9M7 15h10"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1"/></>,
  flag: <><path d="M5 21V4M5 5c5-3 9 3 15 0v10c-6 3-10-3-15 0"/></>,
  shield: <><path d="m12 2 9 4v6c0 5-3 8-9 10-6-2-9-5-9-10V6l9-4Z"/><path d="m8 12 3 3 5-6"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  arrow: <><path d="M4 12h16m-6-6 6 6-6 6"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  chevronDown: <path d="m6 9 6 6 6-6"/>,
  user: <><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2H4Z"/></>,
  check: <path d="m4 12 5 5L20 6"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
  truck: <><path d="M3 6h11v11H3zM14 9h4l3 4v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
