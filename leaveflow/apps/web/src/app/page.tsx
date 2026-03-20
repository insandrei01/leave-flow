import { redirect } from "next/navigation";

/**
 * Root page — redirect authenticated users to the dashboard,
 * unauthenticated users to login.
 *
 * Authentication state is resolved client-side via Firebase Auth.
 * This server component performs a static redirect to the login page;
 * the login page redirects to /dashboard after successful auth.
 */
export default function RootPage() {
  redirect("/login");
}
