import { notFound } from "next/navigation";
import { OperationsDetailScreenClient } from "@/components/client/ClientScreens";
import { isAuctionId } from "@/features/auction";

export default async function AdminAuctionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isAuctionId(id)) notFound();
  return <OperationsDetailScreenClient role="admin" />;
}
