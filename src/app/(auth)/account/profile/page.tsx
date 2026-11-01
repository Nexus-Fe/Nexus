import { RoleGate } from "@/components/auth/RoleGate";
import { AccountProfileScreenClient } from "@/components/client/ClientScreens";

export default function AccountProfilePage() {
  return <RoleGate allowedRoles={["Buyer", "Seller", "Staff", "Admin"]}><AccountProfileScreenClient /></RoleGate>;
}
