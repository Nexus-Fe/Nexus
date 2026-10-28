import { notFound } from "next/navigation";
import { OperationsDetailScreenClient } from "@/components/client/ClientScreens";
import { isAuctionId } from "@/features/auction";
export default async function StaffAuctionPage({ params }: PageProps<"/staff/auctions/[id]">) { const { id } = await params; if (!isAuctionId(id)) notFound(); return <OperationsDetailScreenClient role="staff" />; }

