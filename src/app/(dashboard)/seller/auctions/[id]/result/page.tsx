import { notFound } from "next/navigation";
import { SellerAuctionResultScreenClient } from "@/components/client/ClientScreens";
import { isAuctionId } from "@/features/auction";
export default async function SellerAuctionResultPage({ params }: PageProps<"/seller/auctions/[id]/result">) { const { id } = await params; if (!isAuctionId(id)) notFound(); return <SellerAuctionResultScreenClient />; }

