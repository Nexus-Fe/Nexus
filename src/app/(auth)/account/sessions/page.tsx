import { SessionsScreenClient } from "@/components/client/ClientScreens";
import { RoleGate } from "@/components/auth/RoleGate";

export default function SessionsPage() {
  return <RoleGate allowedRoles={["Buyer", "Seller", "Staff", "Admin"]}><SessionsScreenClient /></RoleGate>;
}
