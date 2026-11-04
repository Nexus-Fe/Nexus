export type ShippingAddress = {
  recipientName: string;
  phoneNumber: string;
  address: string;
};

export type Shipment = {
  id: string;
  orderId: string;
  warehouseId: string;
  carrierId: string;
  trackingNumber: string | null;
  status: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
};
