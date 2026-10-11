import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const allowed: Record<string, RegExp[]> = {
  GET: [
    /^cases(?:\/\d+)?$/,
    /^proceedings\/(?:case\/)?\d+$/,
    /^orders\/(?:proceeding\/)?\d+$/,
    /^payments\/(?:order\/)?\d+$/,
    /^documents\/\d+\/download$/,
    /^health$/,
  ],
  POST: [
    /^auth\/(login|register|logout)$/,
    /^(cases|proceedings|orders|payments)$/,
    /^documents\/upload$/,
    /^calculator\/run$/,
  ],
};
async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const path = (await context.params).path.join("/");
  if (!allowed[request.method]?.some((rule) => rule.test(path)))
    return NextResponse.json(
      { message: "Unsupported operation." },
      { status: 404 },
    );
  // NextURL normalizes 127.0.0.1 to localhost. Compare against the actual
  // request host, which preserves the browser's same-origin boundary.
  const requestOrigin = `${request.nextUrl.protocol}//${request.headers.get("host") || request.nextUrl.host}`;
  if (
    request.method !== "GET" &&
    request.headers.get("origin") !== requestOrigin
  )
    return NextResponse.json(
      { message: "Invalid request origin." },
      { status: 403 },
    );
  const jar = await cookies();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 86400,
  };
  if (path === "auth/logout") {
    jar.delete("alimony_session");
    return NextResponse.json({ success: true });
  }
  const token = jar.get("alimony_session")?.value;
  if (!path.startsWith("auth/") && path !== "health" && !token)
    return NextResponse.json(
      { message: "Please sign in to continue." },
      { status: 401 },
    );
  if (Number(request.headers.get("content-length") || 0) > 11 * 1024 * 1024)
    return NextResponse.json(
      { message: "File must be 10 MB or smaller." },
      { status: 413 },
    );
  try {
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (request.headers.get("content-type"))
      headers.set("Content-Type", request.headers.get("content-type")!);
    const body =
      request.method === "GET" ? undefined : await request.arrayBuffer();
    if (body && body.byteLength > 11 * 1024 * 1024)
      return NextResponse.json(
        { message: "File must be 10 MB or smaller." },
        { status: 413 },
      );
    const upstream = await fetch(
      `${process.env.BACKEND_URL || "http://127.0.0.1:5000"}/api/${path}`,
      {
        method: request.method,
        headers,
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
        redirect: "error",
      },
    );
    if (upstream.status === 401) jar.delete("alimony_session");
    if (upstream.headers.get("content-type")?.includes("application/json")) {
      const data = await upstream.json();
      if (path === "auth/login" && upstream.ok && data.token) {
        jar.set("alimony_session", data.token, cookieOptions);
        delete data.token;
      }
      return NextResponse.json(data, {
        status: upstream.status,
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (!upstream.ok)
      return NextResponse.json(
        { message: "The service could not complete this request." },
        { status: upstream.status },
      );
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") || "application/octet-stream",
        "Content-Disposition":
          upstream.headers.get("content-disposition") || "attachment",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        message:
          "The case service is unavailable. Your entry has not been saved. Please try again when the backend is running.",
      },
      { status: 503 },
    );
  }
}
export { proxy as GET, proxy as POST };
