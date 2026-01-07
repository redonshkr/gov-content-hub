export { auth as middleware } from "@/auth";

// Optional: avoid running middleware on static assets
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
