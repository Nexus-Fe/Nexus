export type AuctionSession = {
  id: string;
  productId: string;
  status: string;
  currentPrice: number;
  endsAt: string;
};

export type BidRequest = {
  amount: number;
};
