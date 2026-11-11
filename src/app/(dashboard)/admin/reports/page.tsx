import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export default function AdminReportsPage() {
  redirect(ROUTES.staff.reports);
}
