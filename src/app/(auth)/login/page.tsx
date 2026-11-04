import { Suspense } from "react";
import { LoginScreenClient } from "@/components/client/ClientScreens";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="route-loading" role="status">Đang tải màn hình…</div>}>
      <LoginScreenClient />
    </Suspense>
  );
}
