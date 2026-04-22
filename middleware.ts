import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("ta_session")?.value === "1";
  const { pathname } = request.nextUrl;

  if (pathname === "/" && session) {
    const url = request.nextUrl.clone();
    url.pathname = "/feed";
    return NextResponse.redirect(url);
  }

  if (pathname === "/feed" && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/feed"],
};
