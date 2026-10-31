import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: RouteContext): Promise<Response> {
  const gatewayAddress = process.env.API_GATEWAY_URL?.trim();
  if (!gatewayAddress) {
    return Response.json(
      { title: "API Gateway chưa được cấu hình.", status: 503, errorCode: "GATEWAY_NOT_CONFIGURED" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  let base: URL;
  try {
    base = new URL(gatewayAddress);
  } catch {
    return Response.json(
      { title: "Địa chỉ API Gateway không hợp lệ.", status: 500, errorCode: "GATEWAY_URL_INVALID" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!new Set(["http:", "https:"]).has(base.protocol) || base.username || base.password) {
    return Response.json(
      { title: "Cấu hình API Gateway phải là địa chỉ HTTP(S) không chứa thông tin đăng nhập.", status: 500, errorCode: "GATEWAY_URL_INVALID" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { path } = await context.params;
  if (!path.length || path[0] !== "api" || path[1] !== "v1") {
    return Response.json(
      { title: "Chỉ cho phép chuyển tiếp API nghiệp vụ phiên bản v1.", status: 404, errorCode: "API_ROUTE_NOT_FOUND" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const upstream = new URL(path.map((segment) => encodeURIComponent(segment)).join("/"), `${base.href.replace(/\/$/, "")}/`);
  upstream.search = new URL(request.url).search;

  const headers = new Headers({ Accept: request.headers.get("accept") ?? "application/json" });
  headers.set("X-Gateway-Mode", "Real");
  headers.set("X-Gateway-Auth", "Enforce");
  const contentType = request.headers.get("content-type");
  const authorization = request.headers.get("authorization");
  if (contentType) headers.set("Content-Type", contentType);
  if (authorization) headers.set("Authorization", authorization);
  for (const name of ["Idempotency-Key", "If-Match"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstream, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return Response.json(
      { title: "Không kết nối được API Gateway.", status: 502, errorCode: "GATEWAY_UNAVAILABLE" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  const mode = upstreamResponse.headers.get("X-Gateway-Mode");
  const authMode = upstreamResponse.headers.get("X-Gateway-Auth");
  if (mode?.toLocaleLowerCase("en-US") !== "real" || authMode?.toLocaleLowerCase("en-US") !== "enforce") {
    return Response.json(
      {
        title: "Gateway chưa được cấu hình kết nối backend thật và xác thực bắt buộc.",
        detail: "Yêu cầu bị chặn để tránh hiển thị dữ liệu giả hoặc dùng chế độ bỏ qua đăng nhập.",
        status: 503,
        errorCode: "GATEWAY_MODE_NOT_ALLOWED",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const responseHeaders = new Headers({
    "Cache-Control": "no-store",
    "X-Gateway-Mode": mode,
    "X-Gateway-Auth": authMode,
  });
  const responseType = upstreamResponse.headers.get("content-type");
  const traceId = upstreamResponse.headers.get("X-Trace-Id");
  if (responseType) responseHeaders.set("Content-Type", responseType);
  if (traceId) responseHeaders.set("X-Trace-Id", traceId);
  const entityTag = upstreamResponse.headers.get("ETag");
  if (entityTag) responseHeaders.set("ETag", entityTag);

  return new Response(
    request.method === "HEAD" ? null : await upstreamResponse.arrayBuffer(),
    { status: upstreamResponse.status, headers: responseHeaders },
  );
}

export async function GET(request: NextRequest, context: RouteContext) { return proxy(request, context); }
export async function HEAD(request: NextRequest, context: RouteContext) { return proxy(request, context); }
export async function POST(request: NextRequest, context: RouteContext) { return proxy(request, context); }
export async function PUT(request: NextRequest, context: RouteContext) { return proxy(request, context); }
export async function PATCH(request: NextRequest, context: RouteContext) { return proxy(request, context); }
export async function DELETE(request: NextRequest, context: RouteContext) { return proxy(request, context); }
