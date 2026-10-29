"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ROUTES } from "@/constants/routes";
import { useSession } from "@/components/auth/SessionProvider";
import { Card, NoData } from "@/components/ui/Primitives";
import { useApiResource } from "@/lib/api/use-api-resource";
import { authService } from "./services/auth.service";
import type { AuthUser } from "./types";

function landingPath(user: AuthUser): string {
  const roles = (user.roles ?? (user.role ? [user.role] : [])).map((role) => role.toLocaleLowerCase("en-US"));
  if (roles.some((role) => role === "admin" || role === "staff" || role === "seller")) return ROUTES.home;
  if (roles.includes("buyer") || roles.includes("customer")) return ROUTES.buyer.cart;
  return ROUTES.home;
}

export function LoginScreen() {
  const router = useRouter();
  const { setAuthenticatedUser } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await authService.login({ identifier, password });
      setAuthenticatedUser(response.data.user);
      router.replace(landingPath(response.data.user));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể đăng nhập.");
    } finally {
      setSubmitting(false);
    }
  }

  return <Card className="auth-card">
    <h1>Đăng nhập tài khoản</h1>
    <p>Truy cập tài khoản NEXUS để theo dõi giao dịch và hoạt động của bạn.</p>
    <form className="auth-fields" onSubmit={submit}>
      <div className="field-wrap"><label htmlFor="login-identifier">Email hoặc tên đăng nhập</label><input id="login-identifier" className="field" type="text" autoComplete="username" required value={identifier} onChange={(event) => setIdentifier(event.target.value)} /></div>
      <div className="field-wrap"><label htmlFor="login-password">Mật khẩu</label><input id="login-password" className="field" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? "Đang đăng nhập…" : "Đăng nhập"}</button>
    </form>
    <p className="auth-footnote"><Link href={ROUTES.auth.forgotPassword}>Quên mật khẩu?</Link></p>
    <p className="auth-footnote">Chưa có tài khoản, <Link href={ROUTES.auth.register}>Đăng kí ngay</Link></p>
    <span className="sr-only">Phiên làm việc được xác thực bởi API Gateway ở chế độ Real.</span>
  </Card>;
}

type RegisterFields = { firstName: string; lastName: string; email: string; phoneNumber: string; password: string };

export function RegisterScreen() {
  const [fields, setFields] = useState<RegisterFields>({ firstName: "", lastName: "", email: "", phoneNumber: "", password: "" });
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"register" | "verify" | "complete">("register");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  function updateField(field: keyof RegisterFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      await authService.register(fields);
      setStep("verify");
      setResendIn(60);
      setMessage("Mã xác minh đã được gửi đến email đăng ký.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tạo tài khoản.");
    } finally {
      setSubmitting(false);
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      await authService.verifyOtp(fields.email, otp);
      setStep("complete");
      setMessage("Tài khoản đã được xác minh. Bạn có thể đăng nhập.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Mã xác minh không hợp lệ.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resendOtp() {
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const response = await authService.resendOtp(fields.email, "REGISTER");
      setResendIn(response.data.resendCooldown || 60);
      setMessage("Đã gửi lại mã xác minh.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể gửi lại mã xác minh.");
    } finally {
      setSubmitting(false);
    }
  }

  return <Card className="auth-card">
    <h1>{step === "verify" ? "Xác minh email" : step === "complete" ? "Tạo tài khoản hoàn tất" : "Tạo tài khoản thành viên"}</h1>
    <p>{step === "verify" ? `Nhập mã xác minh đã gửi tới ${fields.email}.` : step === "complete" ? "Tài khoản đã sẵn sàng để đăng nhập." : "Tạo tài khoản NEXUS để bắt đầu hành trình mua sắm và đấu giá."}</p>
    {step === "register" && <form className="auth-fields" onSubmit={register}>
      <div className="form-grid">
        <div className="field-wrap"><label htmlFor="register-first">Họ</label><input id="register-first" className="field" autoComplete="given-name" required value={fields.firstName} onChange={(event) => updateField("firstName", event.target.value)} /></div>
        <div className="field-wrap"><label htmlFor="register-last">Tên</label><input id="register-last" className="field" autoComplete="family-name" required value={fields.lastName} onChange={(event) => updateField("lastName", event.target.value)} /></div>
      </div>
      <div className="field-wrap"><label htmlFor="register-email">Email</label><input id="register-email" className="field" type="email" autoComplete="email" required value={fields.email} onChange={(event) => updateField("email", event.target.value)} /></div>
      <div className="field-wrap"><label htmlFor="register-phone">Số điện thoại</label><input id="register-phone" className="field" type="tel" autoComplete="tel" required value={fields.phoneNumber} onChange={(event) => updateField("phoneNumber", event.target.value)} /></div>
      <div className="field-wrap"><label htmlFor="register-password">Mật khẩu</label><input id="register-password" className="field" type="password" autoComplete="new-password" minLength={8} required value={fields.password} onChange={(event) => updateField("password", event.target.value)} /></div>
      <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? "Đang gửi…" : "Tạo tài khoản"}</button>
    </form>}
    {step === "verify" && <form className="auth-fields" onSubmit={verify}>
      <div className="field-wrap"><label htmlFor="register-otp">Mã xác minh</label><input id="register-otp" className="field" inputMode="numeric" autoComplete="one-time-code" minLength={6} required value={otp} onChange={(event) => setOtp(event.target.value)} /></div>
      <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? "Đang xác minh…" : "Xác minh tài khoản"}</button>
      <button className="button button-secondary" type="button" disabled={submitting||resendIn>0} onClick={() => void resendOtp()}>{resendIn>0?`Gửi lại mã sau ${resendIn}s`:"Gửi lại mã"}</button>
    </form>}
    {step === "complete" && <Link className="button button-primary" href={ROUTES.auth.login}>Đăng nhập</Link>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {message && <p className="form-success" role="status">{message}</p>}
    <p className="auth-footnote">Đã có tài khoản? <Link href={ROUTES.auth.login}>Đăng nhập</Link></p>
  </Card>;
}

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  useEffect(() => { if (resendIn <= 0) return; const timer=window.setTimeout(()=>setResendIn(value=>Math.max(0,value-1)),1000); return ()=>window.clearTimeout(timer); },[resendIn]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await import("@/lib/api/client").then(({ api }) => api.post("/api/v1/auth/password/forgot", { email }));
      setSent(true); setResendIn(60);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể gửi yêu cầu."); }
    finally { setBusy(false); }
  }
  return <Card className="auth-card"><h1>Quên mật khẩu</h1><p>Nhập email đăng ký để nhận mã OTP đặt lại mật khẩu.</p>
    {sent ? <div><p className="form-success" role="status">Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.</p><div className="action-row"><Link className="button button-primary" href={ROUTES.auth.resetPassword}>Nhập mã OTP</Link><button className="button button-secondary" type="button" disabled={busy||resendIn>0} onClick={()=>{setBusy(true);setError("");void authService.resendOtp(email,"FORGOT_PASSWORD").then(response=>setResendIn(response.data.resendCooldown||60)).catch(reason=>setError(reason instanceof Error?reason.message:"Không thể gửi lại mã OTP.")).finally(()=>setBusy(false));}}>{resendIn>0?`Gửi lại mã sau ${resendIn}s`:"Gửi lại mã OTP"}</button></div>{error&&<p className="form-error" role="alert">{error}</p>}</div> : <form className="auth-fields" onSubmit={submit}><div className="field-wrap"><label htmlFor="forgot-email">Email</label><input id="forgot-email" className="field" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary" disabled={busy}>{busy ? "Đang gửi…" : "Gửi mã OTP"}</button></form>}
    <p className="auth-footnote"><Link href={ROUTES.auth.login}>Quay lại đăng nhập</Link></p></Card>;
}

export function ResetPasswordScreen() {
  const [email, setEmail] = useState(""); const [otpCode, setOtp] = useState(""); const [newPassword, setPassword] = useState(""); const [confirmPassword, setConfirm] = useState(""); const [error, setError] = useState(""); const [done, setDone] = useState(false); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); if (newPassword !== confirmPassword) { setError("Mật khẩu xác nhận không khớp."); return; } setBusy(true); try { const { api } = await import("@/lib/api/client"); await api.put("/api/v1/auth/password/reset", { email, otpCode, newPassword, confirmPassword }); setDone(true); } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể đặt lại mật khẩu."); } finally { setBusy(false); } }
  return <Card className="auth-card"><h1>Đặt lại mật khẩu</h1><p>Nhập email, mã OTP và mật khẩu mới.</p>{done ? <p className="form-success" role="status">Mật khẩu đã được đổi. Đăng nhập lại để tiếp tục.</p> : <form className="auth-fields" onSubmit={submit}><div className="field-wrap"><label htmlFor="reset-email">Email</label><input id="reset-email" className="field" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div><div className="field-wrap"><label htmlFor="reset-otp">Mã OTP</label><input id="reset-otp" className="field" inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={6} required value={otpCode} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} /></div><div className="field-wrap"><label htmlFor="reset-password">Mật khẩu mới</label><input id="reset-password" className="field" type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={e => setPassword(e.target.value)} /></div><div className="field-wrap"><label htmlFor="reset-confirm">Nhập lại mật khẩu mới</label><input id="reset-confirm" className="field" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={e => setConfirm(e.target.value)} /></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary" disabled={busy}>{busy ? "Đang cập nhật…" : "Đặt lại mật khẩu"}</button></form>}<p className="auth-footnote"><Link href={ROUTES.auth.forgotPassword}>Gửi lại mã OTP</Link></p></Card>;
}

export function ChangePasswordScreen() {
  const [oldPassword, setOld] = useState(""); const [newPassword, setNew] = useState(""); const [confirmPassword, setConfirm] = useState(""); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); setMessage(""); if (newPassword !== confirmPassword) { setError("Mật khẩu xác nhận không khớp."); return; } setBusy(true); try { const { api } = await import("@/lib/api/client"); await api.patch("/api/v1/auth/password", { oldPassword, newPassword, confirmPassword }); setMessage("Mật khẩu đã đổi. Hãy đăng nhập lại trên các thiết bị khác."); setOld(""); setNew(""); setConfirm(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể đổi mật khẩu."); } finally { setBusy(false); } }
  return <Card className="auth-card"><h1>Đổi mật khẩu</h1><p>Dùng mật khẩu mới để bảo vệ tài khoản.</p><form className="auth-fields" onSubmit={submit}><label className="field-wrap">Mật khẩu hiện tại<input className="field" type="password" autoComplete="current-password" required value={oldPassword} onChange={e=>setOld(e.target.value)} /></label><label className="field-wrap">Mật khẩu mới<input className="field" type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={e=>setNew(e.target.value)} /></label><label className="field-wrap">Nhập lại mật khẩu mới<input className="field" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={e=>setConfirm(e.target.value)} /></label>{error&&<p className="form-error" role="alert">{error}</p>}{message&&<p className="form-success" role="status">{message}</p>}<button className="button button-primary" disabled={busy}>{busy?"Đang cập nhật…":"Đổi mật khẩu"}</button></form></Card>;
}

export function AccountProfileScreen() {
  const { user } = useSession();
  const [revision,setRevision]=useState(0);const [error,setError]=useState("");const [saved,setSaved]=useState("");const [busy,setBusy]=useState(false);
  const profile=useApiResource(`/api/v1/me:${revision}`,async()=>{const {api}=await import("@/lib/api/client");return api.get<{data:Record<string,unknown>}>('/api/v1/me').then(response=>response.data);});
  const reputation=useApiResource(`/api/v1/me/reputation:${revision}`,async()=>{const {api}=await import("@/lib/api/client");return api.get<{data:Record<string,unknown>}>('/api/v1/me/reputation').then(response=>response.data);});
  const penalties=useApiResource(`/api/v1/me/penalties:${revision}`,async()=>{const {api}=await import("@/lib/api/client");return api.get<{data:{items?:Record<string,unknown>[]}}>('/api/v1/me/penalties?page=1&limit=20').then(response=>response.data.items??[]);});
  async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");setSaved("");const values=new FormData(event.currentTarget);try{const {api}=await import("@/lib/api/client");await api.patch('/api/v1/me',{username:String(values.get("username")??"")||null,firstName:String(values.get("firstName")??""),lastName:String(values.get("lastName")??""),phoneNumber:String(values.get("phoneNumber")??""),address:{provinceId:Number(values.get("provinceId")),districtId:Number(values.get("districtId")),wardCode:String(values.get("wardCode")??""),streetAddress:String(values.get("streetAddress")??"")}});setSaved("Đã cập nhật hồ sơ.");setRevision(v=>v+1);}catch(reason){setError(reason instanceof Error?reason.message:"Không thể cập nhật hồ sơ.");}finally{setBusy(false);}}
  const p=profile.data??{};const r=reputation.data??{};const address=typeof p.address==="object"&&p.address!==null?p.address as Record<string,unknown>:{};
  const displayName=[p.firstName,p.lastName].filter(Boolean).join(" ") || user?.displayName || user?.username || "Tài khoản Nexus";
  const email=String(p.email??user?.email??"");
  const isSeller=Boolean(user?.roles?.some(role=>role.toLowerCase()==="seller")||user?.role?.toLowerCase()==="seller");
  return <div className="profile-page">
    <nav className="profile-breadcrumb" aria-label="Đường dẫn"><Link href={ROUTES.home}>Tài khoản Nexus</Link><span aria-hidden="true">›</span><span>Hồ sơ cá nhân</span></nav>
    <div className="profile-layout">
      <aside className="profile-sidebar">
        <div className="profile-identity"><span className="profile-avatar" aria-hidden="true">{String(displayName).charAt(0).toLocaleUpperCase("vi-VN")}</span><strong>{displayName}</strong>{email&&<small>{email}</small>}</div>
        <nav className="profile-nav" aria-label="Điều hướng tài khoản"><Link href={ROUTES.auth.changePassword}>Đổi mật khẩu &amp; bảo mật</Link></nav>
      </aside>
      <div className="profile-content">
        <section id="profile-information" className="profile-panel"><div className="profile-panel-heading"><div><h1>Hồ sơ cá nhân</h1><p>Cập nhật thông tin cá nhân và phương thức liên hệ.</p></div></div>
          {profile.error&&<p role="alert" className="notice">{profile.error.message}</p>}
          {profile.loading?<NoData title="Đang tải hồ sơ…"/>:profile.error?null:<form className="profile-form" key={revision} onSubmit={e=>void save(e)}>
            <div className="profile-form-grid"><label className="field-wrap">Họ<input className="field" name="firstName" required defaultValue={String(p.firstName??"")}/></label><label className="field-wrap">Tên<input className="field" name="lastName" required defaultValue={String(p.lastName??"")}/></label></div>
            <div className="profile-form-grid"><label className="field-wrap">Email<input className="field" type="email" value={email} readOnly aria-readonly="true" /></label><label className="field-wrap">Số điện thoại liên hệ<input className="field" name="phoneNumber" required defaultValue={String(p.phoneNumber??"")}/></label></div>
            <label className="field-wrap">Tên đăng nhập<input className="field" name="username" defaultValue={String(p.username??"")} maxLength={100}/></label>
            <div id="profile-address" className="profile-form-section"><h2>Địa chỉ liên hệ và giao hàng mặc định</h2><div className="profile-form-grid"><label className="field-wrap">Mã tỉnh<input className="field" name="provinceId" type="number" required defaultValue={String(address.provinceId??"")}/></label><label className="field-wrap">Mã quận/huyện<input className="field" name="districtId" type="number" required defaultValue={String(address.districtId??"")}/></label><label className="field-wrap">Mã phường<input className="field" name="wardCode" required defaultValue={String(address.wardCode??"")}/></label><label className="field-wrap">Địa chỉ cụ thể<input className="field" name="streetAddress" required defaultValue={String(address.streetAddress??"")}/></label></div></div>
            {error&&<p role="alert" className="notice">{error}</p>}{saved&&<p role="status" className="form-success">{saved}</p>}
            <div className="profile-actions"><button type="reset" className="button button-secondary" disabled={busy}>Hủy thao tác</button><button className="button button-primary" disabled={busy||profile.loading}>{busy?"Đang lưu…":"Lưu thay đổi"}</button></div>
          </form>}
        </section>
        <section id="profile-reputation" className="profile-panel"><div className="profile-panel-heading"><div><h2>Điểm uy tín &amp; quyền hạn</h2><p>Thông tin được cập nhật từ tài khoản của bạn.</p></div></div><div className="profile-stats"><div><span>Điểm uy tín</span><strong>{String(r.reputationScore??p.reputationScore??"—")}</strong><small>{String(r.trustLevel??p.trustLevel??"")}</small></div><div><span>Đấu giá</span><strong>{r.canBid===true?"Đủ điều kiện đặt giá":r.canBid===false?"Chưa đủ điều kiện":"Chưa có dữ liệu"}</strong></div><div><span>Bán hàng</span><strong>{r.canSell===true?"Đủ điều kiện bán":r.canSell===false?"Chưa đủ điều kiện":"Chưa có dữ liệu"}</strong></div></div>{reputation.error&&<p role="alert" className="notice">{reputation.error.message}</p>}</section>
        {isSeller&&<section id="profile-selling" className="profile-panel"><div className="profile-panel-heading"><div><h2>Kênh bán hàng</h2><p>Quản lý sản phẩm và phiên đấu giá của gian hàng.</p></div><Link className="button button-secondary" href={ROUTES.seller.products}>Truy cập Seller Center</Link></div></section>}
        <section className="profile-panel"><div className="profile-panel-heading"><div><h2>Lịch sử vi phạm</h2><p>Các ghi nhận liên quan đến tài khoản.</p></div></div>{penalties.error&&<p role="alert" className="notice">{penalties.error.message}</p>}{penalties.data?.length?penalties.data.map((item,index)=><div className="info-row" key={String(item.id??index)}><span><strong>{String(item.violationType??"Vi phạm")}</strong><br/>{String(item.reason??"")}<br/>{String(item.issuedAt??"")}</span><span>{String(item.status??"")}</span></div>):<NoData title={penalties.loading?"Đang tải lịch sử…":penalties.error?"Không tải được lịch sử":"Chưa có vi phạm"}/>}</section>
      </div>
    </div>
  </div>;
}
