// Gateway uses Guid.TryParse and its auction fixtures include GUIDs with zeroed version/variant bits.
export const isAuctionId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
