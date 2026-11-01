# Kế hoạch triển khai Auth (Login / Register / Forgot Password) — Nexus

## Design Language của Nexus (existing system)

- **Audited surface:** `(auth)` route group — `/login`, `/register`
- **Design sources:** [`globals.css`](file:///c:/Users/wuann_/Documents/A_CONFIDENTIAL/Nexus/src/styles/globals.css), [`AuthScreens.tsx`](file:///c:/Users/wuann_/Documents/A_CONFIDENTIAL/Nexus/src/features/auth/AuthScreens.tsx)
- **Documented decisions:**
  - Palette: `--ink: #0f172a`, `--sky: #0284c7`, `--canvas: #f8fafc`, `--line: #e2e8f0`
  - Font: `Plus Jakarta Sans` (loaded via Next.js font)
  - Auth layout: centered card (`auth-card`) trên nền `auth-main`
  - Buttons: `.button .button-primary` / `.button-secondary`
  - Form fields: `.field`, `.field-wrap`
  - Error/success: `.form-error`, `.form-success` — có sẵn trong CSS
- **Governing owners:** `Shells.tsx → AuthShell`, `AuthScreens.tsx`
- **Explicit exceptions:** None

---

## Gap Analysis — Nexus vs Parking Reference

### Backend (parking-api AuthController.cs) — endpoints ĐÃ CÓ sẵn:
```
POST /auth/login              ✅ Nexus authService có
POST /auth/register           ✅ Nexus authService có
POST /auth/otp/verify         ✅ Nexus authService có
POST /auth/otp/resend         ✅ Nexus authService có
POST /auth/logout             ✅ Nexus authService có
POST /auth/password-recovery/request  ❌ Chưa có trong Nexus authService
POST /auth/password-recovery/verify   ❌ Chưa có trong Nexus authService
POST /auth/password-recovery/reset    ❌ Chưa có trong Nexus authService
```

> **Lưu ý quan trọng:** Nexus Gateway backend có thể **đã hỗ trợ** password recovery. Cần tích hợp FE là đủ.

### Frontend Gaps (6 tính năng chính):

| # | Gap | Tác động | Độ khó |
|---|---|---|---|
| 1 | **Quên mật khẩu** toàn bộ flow 3 bước | Blocking — user không thể recover account | Trung bình |
| 2 | **OtpInput 6 ô** riêng biệt | UX kém — paste/auto-focus không hoạt động | Thấp |
| 3 | **OTP Cooldown** 60s đếm ngược | UX kém — user spam resend | Thấp |
| 4 | **Auto-submit OTP** khi nhập đủ 6 số | UX kém — cần click thêm bước | Thấp |
| 5 | **Confirm password + show/hide** | UX kém — user hay nhập sai | Thấp |
| 6 | **Forgot password link** trên LoginScreen | Thiếu entry point | Rất thấp |

---

## Design Plan — Auth screens Nexus

### Nhận diện brief
- **Product:** NEXUS — sàn thương mại điện tử + đấu giá
- **Audience:** Người mua, người bán Việt Nam
- **Palette hiện tại:** Sky blue (#0284c7) trên nền trắng/canvas — sạch, thương mại
- **Typography:** Plus Jakarta Sans — hiện đại, thân thiện

### Design Decisions cho Auth Upgrade
Giữ nguyên identity của Nexus. **Không** dùng split-panel 2 cột kiểu parking-system (quá nặng cho NEXUS). Thay vào đó:

- **Layout:** Card trung tâm giữ nguyên — nhưng nâng cao với subtle gradient border và depth
- **OTP Input:** 6 ô inline, sử dụng màu sky-soft làm focus state
- **Step indicator:** Progress dots trực quan (3 dots) thay vì dạng số
- **Motion:** CSS transition thuần — `opacity + transform` giữa steps (không dùng framer-motion để tránh thêm dependency)
- **Forgot password:** Dùng route `/forgot-password` với cùng layout `auth-card`

---

## Kế hoạch triển khai — 4 Phases

---

## Phase 1: Shared Infrastructure (nền tảng dùng chung)

### Task 1.1 — `useOtpCooldown` hook

**File:** `src/features/auth/hooks/useOtpCooldown.ts`

```typescript
"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const COOLDOWN_DURATION = 60; // seconds

export function useOtpCooldown(email: string) {
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const storageKey = `nexus_otp_cooldown_${email.replace(/[^a-z0-9]/gi, "_")}`;

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback((seconds: number) => {
    stopTimer();
    setCooldown(seconds);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { stopTimer(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  const startCooldown = useCallback(() => {
    if (!email) return;
    const expiryTime = Date.now() + COOLDOWN_DURATION * 1000;
    try { localStorage.setItem(storageKey, String(expiryTime)); } catch { /* private browsing */ }
    startTimer(COOLDOWN_DURATION);
  }, [email, storageKey, startTimer]);

  // Sync from localStorage on mount and focus
  useEffect(() => {
    const sync = () => {
      try {
        const stored = localStorage.getItem(storageKey);
        if (!stored) { setCooldown(0); return; }
        const remaining = Math.ceil((Number(stored) - Date.now()) / 1000);
        if (remaining > 0) startTimer(remaining);
        else { localStorage.removeItem(storageKey); setCooldown(0); }
      } catch { setCooldown(0); }
    };
    sync();
    window.addEventListener("focus", sync);
    return () => { stopTimer(); window.removeEventListener("focus", sync); };
  }, [email, storageKey, startTimer, stopTimer]);

  return { cooldown, startCooldown, isCooldownActive: cooldown > 0 };
}
```

### Task 1.2 — `OtpInput` component

**File:** `src/features/auth/components/OtpInput.tsx`

```tsx
"use client";

import { useRef, useEffect, type ClipboardEvent, type KeyboardEvent, type ChangeEvent } from "react";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  length?: number;
}

export function OtpInput({ value, onChange, disabled = false, length = 6 }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => { refs.current[0]?.focus(); }, []); // focus first on mount

  const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    if (!/^[0-9]?$/.test(val)) return;
    const chars = value.padEnd(length, " ").split("");
    chars[index] = val || " ";
    const next = chars.join("").trimEnd();
    onChange(next);
    if (val && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      const chars = value.split("");
      if (!chars[index] && index > 0) {
        chars[index - 1] = "";
        onChange(chars.join(""));
        refs.current[index - 1]?.focus();
      } else {
        chars[index] = "";
        onChange(chars.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    else if (e.key === "ArrowRight" && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim().slice(0, length);
    if (!/^\d+$/.test(pasted)) return;
    onChange(pasted.padEnd(length, " ").trimEnd());
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className="otp-input-group" role="group" aria-label="Mã xác minh 6 chữ số">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className="otp-input-cell"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          disabled={disabled}
          aria-label={`Chữ số ${i + 1}`}
          autoComplete={i === 0 ? "one-time-code" : "off"}
        />
      ))}
    </div>
  );
}
```

### Task 1.3 — CSS cho OtpInput + auth upgrades

**Thêm vào cuối `src/styles/globals.css`:**

```css
/* ── OTP Input ─────────────────────────────────────── */
.otp-input-group { display: flex; gap: 10px; justify-content: center; }
.otp-input-cell {
  width: 46px; height: 54px; text-align: center; font-size: 22px; font-weight: 700;
  border: 1.5px solid var(--line); border-radius: 10px; background: #fff;
  color: var(--ink); transition: border-color .15s, box-shadow .15s;
}
.otp-input-cell:focus { outline: none; border-color: var(--sky); box-shadow: 0 0 0 3px #0284c726; }
.otp-input-cell:disabled { background: var(--canvas); color: #94a3b8; cursor: not-allowed; }
.otp-input-cell:not(:placeholder-shown):not(:focus) { border-color: #94a3b8; }

/* ── Auth Step Indicator ────────────────────────────── */
.auth-steps { display: flex; justify-content: center; gap: 8px; margin-bottom: 28px; }
.auth-step-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--line); transition: background .2s, width .2s;
}
.auth-step-dot.active { background: var(--sky); width: 24px; border-radius: 4px; }
.auth-step-dot.done { background: #22c55e; }

/* ── OTP Cooldown Timer ─────────────────────────────── */
.otp-resend { font-size: 12px; color: var(--muted); text-align: center; margin-top: 4px; }
.otp-resend button { color: var(--sky); font-weight: 700; border: 0; background: transparent; cursor: pointer; }
.otp-resend button:disabled { color: var(--muted); cursor: not-allowed; }
.otp-cooldown { color: var(--sky); font-weight: 700; }

/* ── Password field with toggle ─────────────────────── */
.field-wrap-password { position: relative; }
.field-wrap-password .field { padding-right: 44px; }
.field-wrap-password .password-toggle {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: transparent; border: 0; color: #94a3b8; cursor: pointer; padding: 4px;
  display: grid; place-items: center; border-radius: 6px;
}
.field-wrap-password .password-toggle:hover { color: var(--sky); background: var(--sky-soft); }

/* ── Auth card step transition ──────────────────────── */
.auth-step { animation: auth-step-in .22s ease both; }
@keyframes auth-step-in {
  from { opacity: 0; transform: translateX(12px); }
  to { opacity: 1; transform: translateX(0); }
}

/* ── Success checkmark ──────────────────────────────── */
.auth-success-icon {
  width: 56px; height: 56px; border-radius: 50%; background: #d1fae5;
  border: 2px solid #a7f3d0; display: grid; place-items: center; margin: 0 auto 20px; color: #059669;
}

/* ── Verified email badge ───────────────────────────── */
.verified-email {
  display: flex; align-items: center; gap: 10px; padding: 11px 14px;
  background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;
  font-size: 12px; color: #166534; margin-bottom: 18px;
}
.verified-email svg { flex: none; color: #22c55e; }
```

### Task 1.4 — Thêm password recovery vào `authService`

**Thêm vào `src/features/auth/services/auth.service.ts`:**

```typescript
  sendPasswordResetOtp(email: string) {
    return api.post<ApiResponse<{ email: string }>>(
      "/api/v1/auth/password-recovery/request",
      { email },
      { skipRefresh: true },
    );
  },

  verifyPasswordResetOtp(email: string, otp: string) {
    return api.post<ApiResponse<{ verificationToken: string; email: string }>>(
      "/api/v1/auth/password-recovery/verify",
      { email, otp },
      { skipRefresh: true },
    );
  },

  resetPassword(email: string, newPassword: string, verificationToken: string) {
    return api.post<ApiResponse<{ success: boolean }>>(
      "/api/v1/auth/password-recovery/reset",
      { email, newPassword, verificationToken },
      { skipRefresh: true },
    );
  },
```

### Task 1.5 — Thêm route `/forgot-password` vào ROUTES

**Sửa `src/constants/routes.ts` dòng 3:**
```typescript
auth: { login: "/login", register: "/register", forgotPassword: "/forgot-password" },
```

---

## Phase 2: Nâng cấp `LoginScreen`

**File:** `src/features/auth/AuthScreens.tsx` — hàm `LoginScreen`

**Thay đổi:**
1. Thêm state `showPassword` + toggle button
2. Thêm link "Quên mật khẩu?" dưới field password
3. Cải thiện error message (giữ nguyên `.form-error` CSS)

```tsx
export function LoginScreen() {
  const router = useRouter();
  const { setAuthenticatedUser } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // NEW
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ... (giữ nguyên submit function)

  return <Card className="auth-card">
    <h1>Đăng nhập tài khoản</h1>
    <p>Truy cập tài khoản NEXUS để theo dõi giao dịch và hoạt động của bạn.</p>
    <form className="auth-fields" onSubmit={submit}>
      <div className="field-wrap">
        <label htmlFor="login-identifier">Email hoặc tên đăng nhập</label>
        <input id="login-identifier" className="field" type="text" autoComplete="username"
          required value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
      </div>
      <div className="field-wrap">
        <label htmlFor="login-password">Mật khẩu</label>
        <div className="field-wrap-password">
          <input id="login-password" className="field" type={showPassword ? "text" : "password"}
            autoComplete="current-password" required value={password}
            onChange={(e) => setPassword(e.target.value)} />
          <button type="button" className="password-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
            {/* Icon eye/eye-off — sử dụng SVG inline hoặc thêm icon vào Icon.tsx */}
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <Link className="text-link" style={{ fontSize: 11, marginTop: 4, display: "block", textAlign: "right" }}
          href={ROUTES.auth.forgotPassword}>Quên mật khẩu?</Link>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary full-width" type="submit" disabled={submitting}>
        {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
    </form>
    <p className="auth-footnote">Chưa có tài khoản, <Link href={ROUTES.auth.register}>Đăng ký ngay</Link></p>
  </Card>;
}
```

---

## Phase 3: Nâng cấp `RegisterScreen`

**Các thay đổi quan trọng:**
1. **Đổi flow:** Email-first (gửi OTP trước, điền info sau) — giống parking reference
2. **OtpInput 6 ô** thay thế input thường
3. **Auto-submit** khi đủ 6 số
4. **Cooldown** 60s
5. **Confirm password + show/hide**
6. **Step indicator** dots

```tsx
type Step = "email" | "verify" | "info" | "complete";

export function RegisterScreen() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [fields, setFields] = useState<RegisterFields>({ firstName: "", lastName: "", phoneNumber: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { cooldown, startCooldown, isCooldownActive } = useOtpCooldown(email);
  const lastAttemptedOtp = useRef("");

  // Step 1: gửi OTP tới email
  async function sendOtp(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authService.register({ email, firstName: "", lastName: "", phoneNumber: "", password: "" }); // hoặc endpoint send-otp nếu có
      // Nexus dùng /api/v1/auth/register để trigger OTP → sau đó verify
      setStep("verify");
      startCooldown();
      setMessage("Mã xác minh đã được gửi tới " + email);
    } catch (err) { setError(err instanceof Error ? err.message : "Không thể gửi mã."); }
    finally { setSubmitting(false); }
  }

  // Auto-submit khi OTP đủ 6 số
  useEffect(() => {
    if (otp.length === 6 && step === "verify" && otp !== lastAttemptedOtp.current && !submitting) {
      const timer = setTimeout(() => { void verifyOtp(); }, 300);
      return () => clearTimeout(timer);
    }
  }, [otp, step, submitting]);

  async function verifyOtp(event?: FormEvent) {
    event?.preventDefault();
    if (otp.length < 6) { setError("Vui lòng nhập đủ 6 chữ số."); return; }
    lastAttemptedOtp.current = otp;
    setError(null);
    setSubmitting(true);
    try {
      await authService.verifyOtp(email, otp);
      setStep("info");
      setMessage(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Mã xác minh không hợp lệ."); }
    finally { setSubmitting(false); }
  }

  async function resendOtp() {
    // ... tương tự sendOtp, gọi authService.resendOtp(email)
  }

  async function completeRegistration(event: FormEvent) {
    event.preventDefault();
    if (fields.password !== fields.confirmPassword) {
      setError("Mật khẩu nhập lại không khớp."); return;
    }
    // gọi authService với otp đã verify (hoặc verificationToken nếu có)
    // ...
    setStep("complete");
  }

  const STEP_ORDER: Step[] = ["email", "verify", "info", "complete"];
  const stepIndex = STEP_ORDER.indexOf(step);

  return <Card className="auth-card">
    {/* Step indicator */}
    <div className="auth-steps" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`auth-step-dot ${i < stepIndex ? "done" : i === stepIndex ? "active" : ""}`} />
      ))}
    </div>

    <h1>{/* dynamic title per step */}</h1>
    <p>{/* dynamic subtitle */}</p>

    {step === "email" && (
      <div className="auth-step">
        <form className="auth-fields" onSubmit={sendOtp}>
          <div className="field-wrap">
            <label htmlFor="reg-email">Email đăng ký</label>
            <input id="reg-email" className="field" type="email" autoComplete="email"
              required value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary full-width" type="submit" disabled={submitting}>
            {submitting ? "Đang gửi…" : "Gửi mã xác minh"}
          </button>
        </form>
      </div>
    )}

    {step === "verify" && (
      <div className="auth-step">
        {message && <p className="form-success" role="status">{message}</p>}
        <form className="auth-fields" onSubmit={verifyOtp}>
          <div className="field-wrap">
            <label>Mã xác minh</label>
            <OtpInput value={otp} onChange={(v) => { setOtp(v); if (v !== lastAttemptedOtp.current) lastAttemptedOtp.current = ""; setError(null); }} disabled={submitting} />
          </div>
          <div className="otp-resend">
            {isCooldownActive
              ? <>Gửi lại sau <span className="otp-cooldown">{cooldown}s</span></>
              : <button type="button" disabled={submitting} onClick={resendOtp}>Gửi lại mã</button>
            }
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary full-width" type="submit" disabled={submitting || otp.length < 6}>
            {submitting ? "Đang xác minh…" : "Xác minh"}
          </button>
          <button className="button button-secondary full-width" type="button" onClick={() => { setStep("email"); setOtp(""); setError(null); }}>
            Thay đổi email
          </button>
        </form>
      </div>
    )}

    {step === "info" && (
      <div className="auth-step">
        <div className="verified-email">
          <CheckIcon size={16} /> {email} — đã xác minh
        </div>
        <form className="auth-fields" onSubmit={completeRegistration}>
          <div className="form-grid">
            <div className="field-wrap"><label htmlFor="reg-first">Họ</label><input id="reg-first" className="field" autoComplete="given-name" required value={fields.firstName} onChange={(e) => updateField("firstName", e.target.value)} /></div>
            <div className="field-wrap"><label htmlFor="reg-last">Tên</label><input id="reg-last" className="field" autoComplete="family-name" required value={fields.lastName} onChange={(e) => updateField("lastName", e.target.value)} /></div>
          </div>
          <div className="field-wrap"><label htmlFor="reg-phone">Số điện thoại</label><input id="reg-phone" className="field" type="tel" autoComplete="tel" required value={fields.phoneNumber} onChange={(e) => updateField("phoneNumber", e.target.value)} /></div>
          <div className="field-wrap">
            <label htmlFor="reg-password">Mật khẩu</label>
            <div className="field-wrap-password">
              <input id="reg-password" className="field" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required value={fields.password} onChange={(e) => updateField("password", e.target.value)} />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} aria-label="Hiện/ẩn mật khẩu"><EyeIcon show={showPassword} /></button>
            </div>
          </div>
          <div className="field-wrap">
            <label htmlFor="reg-confirm">Nhập lại mật khẩu</label>
            <div className="field-wrap-password">
              <input id="reg-confirm" className="field" type={showConfirm ? "text" : "password"} autoComplete="new-password" required value={fields.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} />
              <button type="button" className="password-toggle" onClick={() => setShowConfirm((v) => !v)} aria-label="Hiện/ẩn mật khẩu nhập lại"><EyeIcon show={showConfirm} /></button>
            </div>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary full-width" type="submit" disabled={submitting}>
            {submitting ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
          </button>
        </form>
      </div>
    )}

    {step === "complete" && (
      <div className="auth-step" style={{ textAlign: "center" }}>
        <div className="auth-success-icon"><CheckIcon size={28} /></div>
        <p>Tài khoản đã sẵn sàng để đăng nhập.</p>
        <Link className="button button-primary full-width" href={ROUTES.auth.login}>Đăng nhập ngay</Link>
      </div>
    )}

    {step !== "complete" && <p className="auth-footnote">Đã có tài khoản? <Link href={ROUTES.auth.login}>Đăng nhập</Link></p>}
  </Card>;
}
```

---

## Phase 4: ForgotPasswordScreen (MỚI HOÀN TOÀN)

### Task 4.1 — Tạo route

**File:** `src/app/(auth)/forgot-password/page.tsx`
```tsx
import { ForgotPasswordScreenClient } from "@/components/client/ClientScreens";
export default function ForgotPasswordPage() { return <ForgotPasswordScreenClient />; }
```

**Thêm vào `src/components/client/ClientScreens.tsx`:**
```tsx
export const ForgotPasswordScreenClient = dynamic(
  () => import("@/features/auth/AuthScreens").then((m) => m.ForgotPasswordScreen),
  { loading: ScreenLoading },
);
```

### Task 4.2 — `ForgotPasswordScreen` component

**Thêm vào `src/features/auth/AuthScreens.tsx`:**

```tsx
type ForgotStep = "email" | "verify" | "reset" | "complete";

export function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<ForgotStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { cooldown, startCooldown, isCooldownActive } = useOtpCooldown(email);
  const lastAttemptedOtp = useRef("");

  // STEP 1: Gửi OTP khôi phục mật khẩu
  async function sendResetOtp(event: FormEvent) {
    event.preventDefault();
    setError(null); setSubmitting(true);
    try {
      await authService.sendPasswordResetOtp(email);
      setStep("verify"); startCooldown();
    } catch (err) { setError(err instanceof Error ? err.message : "Không thể gửi mã."); }
    finally { setSubmitting(false); }
  }

  // STEP 2: Xác minh OTP — auto trigger khi đủ 6 số
  useEffect(() => {
    if (otp.length === 6 && step === "verify" && otp !== lastAttemptedOtp.current && !submitting) {
      const t = setTimeout(() => { void verifyResetOtp(); }, 300);
      return () => clearTimeout(t);
    }
  }, [otp, step, submitting]);

  async function verifyResetOtp(event?: FormEvent) {
    event?.preventDefault();
    if (otp.length < 6) { setError("Vui lòng nhập đủ 6 chữ số."); return; }
    lastAttemptedOtp.current = otp;
    setError(null); setSubmitting(true);
    try {
      const response = await authService.verifyPasswordResetOtp(email, otp);
      setVerificationToken(response.data.verificationToken);
      setStep("reset");
    } catch (err) { setError(err instanceof Error ? err.message : "Mã không hợp lệ."); }
    finally { setSubmitting(false); }
  }

  // STEP 3: Đặt mật khẩu mới
  async function resetPassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) { setError("Mật khẩu nhập lại không khớp."); return; }
    if (newPassword.length < 8) { setError("Mật khẩu phải ít nhất 8 ký tự."); return; }
    setError(null); setSubmitting(true);
    try {
      await authService.resetPassword(email, newPassword, verificationToken);
      setStep("complete");
    } catch (err) { setError(err instanceof Error ? err.message : "Không thể đặt mật khẩu."); }
    finally { setSubmitting(false); }
  }

  const STEP_ORDER: ForgotStep[] = ["email", "verify", "reset", "complete"];
  const stepIndex = STEP_ORDER.indexOf(step);

  const titles: Record<ForgotStep, string> = {
    email: "Khôi phục mật khẩu",
    verify: "Xác minh email",
    reset: "Đặt mật khẩu mới",
    complete: "Đặt lại thành công",
  };
  const subtitles: Record<ForgotStep, string> = {
    email: "Nhập email đăng ký để nhận mã xác minh.",
    verify: `Nhập mã xác minh đã gửi tới ${email}.`,
    reset: "Tạo mật khẩu mới cho tài khoản của bạn.",
    complete: "Mật khẩu đã được cập nhật. Bạn có thể đăng nhập.",
  };

  return <Card className="auth-card">
    <div className="auth-steps" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`auth-step-dot ${i < stepIndex ? "done" : i === stepIndex ? "active" : ""}`} />
      ))}
    </div>

    <h1>{titles[step]}</h1>
    <p>{subtitles[step]}</p>

    {step === "email" && (
      <div className="auth-step">
        <form className="auth-fields" onSubmit={sendResetOtp}>
          <div className="field-wrap">
            <label htmlFor="fp-email">Email đăng ký</label>
            <input id="fp-email" className="field" type="email" autoComplete="email"
              required value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary full-width" type="submit" disabled={submitting}>
            {submitting ? "Đang gửi…" : "Gửi mã xác minh"}
          </button>
        </form>
        <p className="auth-footnote"><Link href={ROUTES.auth.login}>Quay lại đăng nhập</Link></p>
      </div>
    )}

    {step === "verify" && (
      <div className="auth-step">
        <form className="auth-fields" onSubmit={verifyResetOtp}>
          <div className="field-wrap">
            <label>Mã xác minh</label>
            <OtpInput value={otp} onChange={(v) => { setOtp(v); if (v !== lastAttemptedOtp.current) lastAttemptedOtp.current = ""; setError(null); }} disabled={submitting} />
          </div>
          <div className="otp-resend">
            {isCooldownActive
              ? <>Gửi lại sau <span className="otp-cooldown">{cooldown}s</span></>
              : <button type="button" disabled={submitting} onClick={() => { void sendResetOtp({ preventDefault: () => {} } as FormEvent); }}>Gửi lại mã</button>
            }
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary full-width" type="submit" disabled={submitting || otp.length < 6}>
            {submitting ? "Đang xác minh…" : "Xác minh"}
          </button>
          <button className="button button-secondary full-width" type="button" onClick={() => { setStep("email"); setOtp(""); setError(null); }}>
            Thay đổi email
          </button>
        </form>
      </div>
    )}

    {step === "reset" && (
      <div className="auth-step">
        <div className="verified-email">
          <CheckIcon size={16} /> {email} — đã xác minh
        </div>
        <form className="auth-fields" onSubmit={resetPassword}>
          <div className="field-wrap">
            <label htmlFor="fp-new-password">Mật khẩu mới</label>
            <div className="field-wrap-password">
              <input id="fp-new-password" className="field" type={showPassword ? "text" : "password"}
                autoComplete="new-password" minLength={8} required value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(null); }} />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} aria-label="Hiện/ẩn mật khẩu">
                <EyeIcon show={showPassword} />
              </button>
            </div>
          </div>
          <div className="field-wrap">
            <label htmlFor="fp-confirm">Xác nhận mật khẩu mới</label>
            <div className="field-wrap-password">
              <input id="fp-confirm" className="field" type={showConfirm ? "text" : "password"}
                autoComplete="new-password" required value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }} />
              <button type="button" className="password-toggle" onClick={() => setShowConfirm((v) => !v)} aria-label="Hiện/ẩn mật khẩu xác nhận">
                <EyeIcon show={showConfirm} />
              </button>
            </div>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary full-width" type="submit" disabled={submitting}>
            {submitting ? "Đang lưu…" : "Đặt mật khẩu mới"}
          </button>
        </form>
      </div>
    )}

    {step === "complete" && (
      <div className="auth-step" style={{ textAlign: "center" }}>
        <div className="auth-success-icon"><CheckIcon size={28} /></div>
        <Link className="button button-primary full-width" href={ROUTES.auth.login}>Đăng nhập ngay</Link>
      </div>
    )}
  </Card>;
}
```

---

## Phase 5: Icon utilities (phụ trợ)

### Task 5.1 — Thêm icon vào `Icon.tsx`

Thêm 2 icon `eye` và `eyeOff` vào type `IconName` và object `paths`:
```tsx
// Thêm vào type IconName:
| "eye" | "eyeOff"

// Thêm vào paths:
eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></>,
eyeOff: <><path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-5.12M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.09 18.09 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/></>,
```

Và tạo helper component nhỏ trong `AuthScreens.tsx`:
```tsx
function EyeIcon({ show }: { show: boolean }) {
  return <Icon name={show ? "eyeOff" : "eye"} size={17} />;
}

function CheckIcon({ size = 18 }: { size?: number }) {
  return <Icon name="check" size={size} />;
}
```

---

## Thứ tự triển khai (execution order)

```
Phase 1.1 → hooks/useOtpCooldown.ts          (new file)
Phase 1.2 → features/auth/components/OtpInput.tsx  (new file)
Phase 1.3 → styles/globals.css               (append CSS)
Phase 1.4 → features/auth/services/auth.service.ts (add methods)
Phase 1.5 → constants/routes.ts              (add forgotPassword route)
Phase 5.1 → components/ui/Icon.tsx           (add eye icons)
Phase 2   → features/auth/AuthScreens.tsx    (update LoginScreen)
Phase 3   → features/auth/AuthScreens.tsx    (update RegisterScreen)
Phase 4.1 → app/(auth)/forgot-password/page.tsx (new route)
Phase 4.2 → components/client/ClientScreens.tsx (add ForgotPasswordScreenClient)
Phase 4.3 → features/auth/AuthScreens.tsx    (add ForgotPasswordScreen)
```

---

## Checklist xác nhận hoàn thành

- [ ] `useOtpCooldown` persists qua localStorage, sync on tab focus
- [ ] `OtpInput` auto-focus next cell, backspace, paste, keyboard nav
- [ ] Register: email-first → OTP → info (confirm password, show/hide)
- [ ] Register: auto-submit khi nhập đủ 6 số OTP
- [ ] Register: cooldown 60s với đếm ngược visible
- [ ] Login: show/hide password toggle
- [ ] Login: "Quên mật khẩu?" link đến `/forgot-password`
- [ ] Forgot password: wizard 3 bước hoàn chỉnh
- [ ] Forgot password: OTP auto-submit + cooldown
- [ ] Forgot password: confirm password + show/hide
- [ ] Route `/forgot-password` được render qua `AuthShell`
- [ ] Tất cả error messages dùng `.form-error` class có sẵn
- [ ] Step indicator dots animate đúng per step
- [ ] CSS animation `auth-step-in` cho mỗi step transition
- [ ] `prefers-reduced-motion` được tôn trọng (CSS rule đã có)
- [ ] Tất cả inputs có `id` + `label[htmlFor]` đúng (accessibility)
- [ ] Tất cả interactive elements có `aria-label` phù hợp
