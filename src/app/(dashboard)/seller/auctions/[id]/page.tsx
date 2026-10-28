import { notFound } from "next/navigation";
import { OperationsDetailScreenClient } from "@/components/client/ClientScreens";
import { isAuctionId } from "@/features/auction";
export default async function SellerAuctionPage({ params }: PageProps<"/seller/auctions/[id]">) { const { id } = await params; if (!isAuctionId(id)) notFound(); return <OperationsDetailScreenClient role="seller" />; }

