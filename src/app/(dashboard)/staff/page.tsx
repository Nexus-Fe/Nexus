import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export default function StaffRootPage() {
  redirect(ROUTES.staff.auctions);
}
