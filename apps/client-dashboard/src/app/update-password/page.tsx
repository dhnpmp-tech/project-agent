// Password update is gone — OTP doesn't need passwords. Redirect to login.

import { redirect } from "next/navigation";

export default function UpdatePasswordPage() {
  redirect("/login");
}
