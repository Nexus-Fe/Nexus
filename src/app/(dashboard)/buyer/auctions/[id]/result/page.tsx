import { notFound } from "next/navigation";
import { BuyerAuctionResultScreenClient } from "@/components/client/ClientScreens";
import { isAuctionId } from "@/features/auction";
export default async function BuyerAuctionResultPage({ params }: PageProps<"/buyer/auctions/[id]/result">) { const { id } = await params; if (!isAuctionId(id)) notFound(); return <BuyerAuctionResultScreenClient />; }

