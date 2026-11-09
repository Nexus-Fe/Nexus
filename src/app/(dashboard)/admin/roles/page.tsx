import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export default function AdminRolesPage() { redirect(ROUTES.admin.users); }
