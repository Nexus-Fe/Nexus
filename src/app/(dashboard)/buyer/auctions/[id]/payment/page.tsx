import { notFound } from "next/navigation";
import { BuyerAuctionPaymentScreenClient } from "@/components/client/ClientScreens";
import { isAuctionId } from "@/features/auction";
export default async function BuyerAuctionPaymentPage({ params }: PageProps<"/buyer/auctions/[id]/payment">) { const { id } = await params; if (!isAuctionId(id)) notFound(); return <BuyerAuctionPaymentScreenClient payment />; }

