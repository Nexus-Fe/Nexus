# CI và triển khai frontend

## Kiểm tra trên GitHub Actions

Các workflow CI trong `.github/workflows/` chạy cài đặt dependencies, ESLint, typecheck và build. Chạy cùng các bước trước khi mở PR:

```powershell
npm ci
npm run lint
npm run typecheck
npm run build
```

Hiện repo có cả `ci.yml` (Frontend CI) và `nextjs-ci.yml` (Nexus CI), nên một push có thể tạo hai lượt kiểm tra tương tự. Chỉ merge khi các check bắt buộc của PR đạt.

## Image và VPS

Sau khi push lên `dev` và workflow **Frontend CI** đạt, image Next.js standalone được publish lên GitHub Container Registry theo tag `ghcr.io/<owner>/<repo>:sha-<commit-sha>`. Ứng dụng có Gateway proxy phía server nên cần nơi chạy Node; GitHub Pages không chạy được bản này.

Workflow **Deploy frontend to VPS** là thao tác thủ công qua `workflow_dispatch`. Nhập SHA đầy đủ của commit `dev` đã có image. Trước lần chạy đầu, tạo GitHub Environment `production` với các secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`, `GHCR_READ_USER`, `GHCR_READ_TOKEN`; đặt biến `API_GATEWAY_URL` và tùy chọn `VPS_PORT` (mặc định 22).

VPS user cần quyền Docker Compose. Workflow chép `deploy/compose.yaml` vào `~/nexus-fe`, chạy container trên `127.0.0.1:3000`; TLS reverse proxy cấu hình riêng. `API_GATEWAY_URL` phải truy cập được từ **bên trong container**. Hiện chưa có VPS production, nên bước deploy chỉ sẵn workflow và chưa được kiểm chứng trên máy chủ.
