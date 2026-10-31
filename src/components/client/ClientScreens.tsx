"use client";

import dynamic from "next/dynamic";

function ScreenLoading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading-mark" aria-hidden="true" />
      <span>Đang tải màn hình…</span>
    </div>
  );
}

export const LoginScreenClient = dynamic(
  () => import("@/features/auth/AuthScreens").then((module) => module.LoginScreen),
  { ssr: false, loading: ScreenLoading },
);
export const RegisterScreenClient = dynamic(
  () => import("@/features/auth/AuthScreens").then((module) => module.RegisterScreen),
  { ssr: false, loading: ScreenLoading },
);
export const ForgotPasswordScreenClient = dynamic(() => import("@/features/auth/AuthScreens").then((module) => module.ForgotPasswordScreen), { ssr: false, loading: ScreenLoading });
export const ResetPasswordScreenClient = dynamic(() => import("@/features/auth/AuthScreens").then((module) => module.ResetPasswordScreen), { ssr: false, loading: ScreenLoading });
export const ChangePasswordScreenClient = dynamic(() => import("@/features/auth/AuthScreens").then((module) => module.ChangePasswordScreen), { ssr: false, loading: ScreenLoading });
export const AccountProfileScreenClient = dynamic(() => import("@/features/auth/AuthScreens").then((module) => module.AccountProfileScreen), { ssr: false, loading: ScreenLoading });

export const HomeScreenClient = dynamic(
  () => import("@/features/catalog/CatalogScreens").then((module) => module.HomeScreen),
  { ssr: false, loading: ScreenLoading },
);
export const CatalogScreenClient = dynamic(
  () => import("@/features/catalog/CatalogScreens").then((module) => module.CatalogScreen),
  { ssr: false, loading: ScreenLoading },
);
export const ProductDetailScreenClient = dynamic(
  () => import("@/features/catalog/CatalogScreens").then((module) => module.ProductDetailScreen),
  { ssr: false, loading: ScreenLoading },
);
export const AuctionRoomScreenClient = dynamic(
  () => import("@/features/auction").then((module) => module.AuctionRoomScreen),
  { ssr: false, loading: ScreenLoading },
);
export const AuctionListScreenClient = dynamic(() => import("@/features/auction").then((module) => module.AuctionListScreen), { ssr: false, loading: ScreenLoading });
export const MyAuctionsScreenClient = dynamic(() => import("@/features/auction").then((module) => module.MyAuctionsScreen), { ssr: false, loading: ScreenLoading });
export const BuyerAuctionResultScreenClient = dynamic(() => import("@/features/auction").then((module) => module.BuyerAuctionResultScreen), { ssr: false, loading: ScreenLoading });
export const BuyerAuctionPaymentScreenClient = dynamic(() => import("@/features/auction").then((module) => module.BuyerAuctionResultScreen), { ssr: false, loading: ScreenLoading });
export const OperationsListScreenClient = dynamic(() => import("@/features/auction").then((module) => module.OperationsListScreen), { ssr: false, loading: ScreenLoading });
export const OperationsDetailScreenClient = dynamic(() => import("@/features/auction").then((module) => module.OperationsDetailScreen), { ssr: false, loading: ScreenLoading });
export const SellerAuctionResultScreenClient = dynamic(() => import("@/features/auction").then((module) => module.SellerAuctionResultScreen), { ssr: false, loading: ScreenLoading });
export const SellerAuctionFormScreenClient = dynamic(() => import("@/features/auction").then((module) => module.SellerAuctionEditorScreen), { ssr: false, loading: ScreenLoading });
export const SellerAuctionRecreateScreenClient = dynamic(() => import("@/features/auction").then((module) => module.SellerAuctionEditorScreen), { ssr: false, loading: ScreenLoading });
export const AdminAuctionConfigsScreenClient = dynamic(() => import("@/features/auction").then((module) => module.AdminAuctionConfigsScreen), { ssr: false, loading: ScreenLoading });

export const CartScreenClient = dynamic(
  () => import("@/features/commerce/CommerceScreens").then((module) => module.CartScreen),
  { ssr: false, loading: ScreenLoading },
);
export const CheckoutScreenClient = dynamic(
  () => import("@/features/commerce/CommerceScreens").then((module) => module.CheckoutScreen),
  { ssr: false, loading: ScreenLoading },
);
export const OrdersScreenClient = dynamic(
  () => import("@/features/commerce/CommerceScreens").then((module) => module.OrdersScreen),
  { ssr: false, loading: ScreenLoading },
);
export const OrderDetailScreenClient = dynamic(
  () => import("@/features/commerce/CommerceScreens").then((module) => module.OrderDetailScreen),
  { ssr: false, loading: ScreenLoading },
);
export const BuyerReportsScreenClient = dynamic(() => import("@/features/commerce/CommerceScreens").then((module) => module.BuyerReportsScreen), { ssr: false, loading: ScreenLoading });
export const BuyerOrderReviewScreenClient = dynamic(() => import("@/features/commerce/CommerceScreens").then((module) => module.BuyerOrderReviewScreen), { ssr: false, loading: ScreenLoading });

export const WalletScreenClient = dynamic(
  () => import("@/features/wallet/WalletScreen").then((module) => module.WalletScreen),
  { ssr: false, loading: ScreenLoading },
);
export const BuyerTopUpScreenClient = dynamic(() => import("@/features/wallet/WalletOperationsScreens").then((module) => module.BuyerTopUpScreen), { ssr: false, loading: ScreenLoading });
export const SellerWalletScreenClient = dynamic(() => import("@/features/wallet/WalletOperationsScreens").then((module) => module.SellerWalletScreen), { ssr: false, loading: ScreenLoading });
export const SellerWithdrawalsScreenClient = dynamic(() => import("@/features/wallet/WalletOperationsScreens").then((module) => module.SellerWithdrawalsScreen), { ssr: false, loading: ScreenLoading });

export const BecomeSellerScreenClient = dynamic(
  () => import("@/features/seller/SellerScreens").then((module) => module.BecomeSellerScreen),
  { ssr: false, loading: ScreenLoading },
);
export const SellerProductsScreenClient = dynamic(
  () => import("@/features/seller/SellerScreens").then((module) => module.SellerProductsScreen),
  { ssr: false, loading: ScreenLoading },
);
export const SellerProductDetailScreenClient = dynamic(
  () => import("@/features/seller/SellerScreens").then((module) => module.SellerProductDetailScreen),
  { ssr: false, loading: ScreenLoading },
);
export const SellerProductEditorScreenClient = dynamic(
  () => import("@/features/seller/SellerScreens").then((module) => module.SellerProductEditorScreen),
  { ssr: false, loading: ScreenLoading },
);
export const SellerInventoryScreenClient = dynamic(
  () => import("@/features/seller/SellerScreens").then((module) => module.SellerInventoryScreen),
  { ssr: false, loading: ScreenLoading },
);
export const SellerOrdersScreenClient = dynamic(
  () => import("@/features/seller/SellerScreens").then((module) => module.SellerOrdersScreen),
  { ssr: false, loading: ScreenLoading },
);
export const SellerShipmentsScreenClient = dynamic(() => import("@/features/seller/SellerScreens").then((module) => module.SellerShipmentsScreen), { ssr: false, loading: ScreenLoading });
export const SellerOrderDetailScreenClient = dynamic(() => import("@/features/seller/SellerScreens").then((module) => module.SellerOrderDetailScreen), { ssr: false, loading: ScreenLoading });
export const SellerShipmentDetailScreenClient = dynamic(() => import("@/features/seller/SellerScreens").then((module) => module.SellerShipmentDetailScreen), { ssr: false, loading: ScreenLoading });
export const SellerShopScreenClient = dynamic(() => import("@/features/seller/SellerScreens").then((module) => module.SellerShopScreen), { ssr: false, loading: ScreenLoading });
export const SellerAuctionsScreenClient = dynamic(
  () => import("@/features/auction").then((module) => module.OperationsListScreen),
  { ssr: false, loading: ScreenLoading },
);
export const SellerAuctionEditorScreenClient = dynamic(
  () => import("@/features/auction").then((module) => module.SellerAuctionEditorScreen),
  { ssr: false, loading: ScreenLoading },
);

export const StaffSellersScreenClient = dynamic(
  () => import("@/features/staff/StaffScreens").then((module) => module.StaffSellersScreen),
  { ssr: false, loading: ScreenLoading },
);
export const StaffSellerDetailScreenClient = dynamic(
  () => import("@/features/staff/StaffScreens").then((module) => module.StaffSellerDetailScreen),
  { ssr: false, loading: ScreenLoading },
);
export const StaffReportsScreenClient = dynamic(
  () => import("@/features/staff/StaffScreens").then((module) => module.StaffReportsScreen),
  { ssr: false, loading: ScreenLoading },
);
export const StaffQueueScreenClient = dynamic(() => import("@/features/staff/StaffScreens").then((module) => module.StaffQueueScreen), { ssr: false, loading: ScreenLoading });

export const AdminUsersScreenClient = dynamic(
  () => import("@/features/admin/AdminScreens").then((module) => module.AdminUsersScreen),
  { ssr: false, loading: ScreenLoading },
);
export const AdminRolesScreenClient = dynamic(
  () => import("@/features/admin/AdminScreens").then((module) => module.AdminRolesScreen),
  { ssr: false, loading: ScreenLoading },
);
export const AdminOverviewScreenClient = dynamic(() => import("@/features/admin/AdminScreens").then((module) => module.AdminOverviewScreen), { ssr: false, loading: ScreenLoading });
export const AdminAuditLogScreenClient = dynamic(() => import("@/features/admin/AdminScreens").then((module) => module.AdminAuditLogScreen), { ssr: false, loading: ScreenLoading });
export const AdminContractScreenClient = dynamic(() => import("@/features/admin/AdminScreens").then((module) => module.AdminContractScreen), { ssr: false, loading: ScreenLoading });
