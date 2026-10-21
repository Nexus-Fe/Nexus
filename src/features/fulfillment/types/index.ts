export type ShippingAddress = {
  recipientName: string;
  phoneNumber: string;
  address: string;
};

export type TrackingStep = {
  status: string;
  description: string;
  occurredAt: string;
};

export type Shipment = {
  id: string;
  orderId: string;
  status: string;
  trackingSteps: TrackingStep[];
};
