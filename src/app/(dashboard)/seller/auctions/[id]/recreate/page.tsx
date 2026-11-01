import { notFound } from "next/navigation";
import { SellerAuctionRecreateScreenClient } from "@/components/client/ClientScreens";
import { isAuctionId } from "@/features/auction";
export default async function SellerAuctionRecreatePage({ params }: PageProps<"/seller/auctions/[id]/recreate">) { const { id } = await params; if (!isAuctionId(id)) notFound(); return <SellerAuctionRecreateScreenClient recreate />; }

