// Post-login landing page. Reads the JWT session and routes:
//   no session       → /login
//   session with client_id → /dashboard
//   session without client_id → /onboarding

import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";

export default async function Home() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }
  if (session.clientId) {
    redirect("/dashboard");
  }
  redirect("/onboarding");
}
