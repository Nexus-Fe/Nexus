import { notFound } from "next/navigation";
import { SellerAuctionFormScreenClient } from "@/components/client/ClientScreens";
import { isAuctionId } from "@/features/auction";
export default async function SellerAuctionEditPage({ params }: PageProps<"/seller/auctions/[id]/edit">) { const { id } = await params; if (!isAuctionId(id)) notFound(); return <SellerAuctionFormScreenClient edit />; }

