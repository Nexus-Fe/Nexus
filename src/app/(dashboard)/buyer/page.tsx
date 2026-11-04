import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export default function BuyerRootPage() {
  redirect(ROUTES.buyer.orders);
}
