import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export default function AdminAuctionsPage() {
  redirect(ROUTES.staff.auctions);
}
