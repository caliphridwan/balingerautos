import { withAuth } from "next-auth/middleware";

/**
 * First line of defence: no session → redirect to /admin/login.
 * Every admin page and action ALSO verifies the user and role server-side
 * (lib/auth/guards.ts), so this is never the only check.
 */
export default withAuth({
  pages: { signIn: "/admin/login" },
});

export const config = {
  matcher: ["/admin", "/admin/((?!login).*)", "/api/admin/:path*"],
};
