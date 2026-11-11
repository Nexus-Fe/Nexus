import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export default async function AdminAuctionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(ROUTES.staff.auction(id));
}
