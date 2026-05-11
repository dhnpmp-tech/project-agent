// Signup is now the same flow as login — the OTP system auto-creates an
// auth_user on first verified code. This page just redirects.

import { redirect } from "next/navigation";

export default function SignupPage() {
  redirect("/login");
}
