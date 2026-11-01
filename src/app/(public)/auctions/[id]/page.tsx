import { Suspense } from "react";
import { AuctionRoomScreenClient } from "@/components/client/ClientScreens";
import { notFound } from "next/navigation";
import { isAuctionId } from "@/features/auction";

function AuctionLoading() {
  return <div className="route-loading" role="status" aria-live="polite">Đang mở phòng đấu giá…</div>;
}

async function AuctionRoom({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isAuctionId(id)) notFound();
  return <AuctionRoomScreenClient />;
}

export default function AuctionRoomPage({ params }: PageProps<"/auctions/[id]">) {
  return <Suspense fallback={<AuctionLoading />}><AuctionRoom params={params} /></Suspense>;
}

