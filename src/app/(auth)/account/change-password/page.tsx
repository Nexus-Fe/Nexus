import { ChangePasswordScreenClient } from "@/components/client/ClientScreens";
import { RoleGate } from "@/components/auth/RoleGate";

export default function ChangePasswordPage() {
  return <RoleGate allowedRoles={["Buyer", "Seller", "Staff", "Admin"]}><ChangePasswordScreenClient /></RoleGate>;
}
