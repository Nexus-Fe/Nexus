import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export default function AdminPenaltiesPage() {
  redirect(ROUTES.staff.penalties);
}
