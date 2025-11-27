import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api } from "@/clients/api";
import PortalShell from "./portal-shell";
import { env } from "@/env";

export default async function PortalPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const result = await api.auth.me.query({
    query: { appSlug: env.IAM_APP_SLUG },
    headers: { cookie: cookieHeader },
  });

  if (result.status === 401) {
    redirect(`/auth/login?next=${encodeURIComponent("/portal")}`);
  }

  if (result.status !== 200) {
    throw new Error("Failed to load auth context");
  }

  const auth = result.body;
  return <PortalShell auth={auth} />;
}
