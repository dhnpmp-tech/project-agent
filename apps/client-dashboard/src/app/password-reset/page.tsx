// Password reset is gone — OTP doesn't need passwords. Redirect to login.

import { redirect } from "next/navigation";

export default function PasswordResetPage() {
  redirect("/login");
}
