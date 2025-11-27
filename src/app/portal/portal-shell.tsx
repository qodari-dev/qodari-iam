"use client";

import type { MeResponse } from "@/schemas/auth";
import { api } from "@/clients/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getTsRestErrorMessage } from "@/utils/get-ts-rest-error-message";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";

import { AuthStoreProvider, useAuth } from "@/stores/auth-store-provider";

type PortalShellProps = {
  auth: MeResponse;
};

export default function PortalShell({ auth }: PortalShellProps) {
  return (
    <AuthStoreProvider initialAuth={auth}>
      <PortalContent />
    </AuthStoreProvider>
  );
}

function PortalContent() {
  const router = useRouter();
  const auth = useAuth();

  const { mutateAsync: logout, isPending } = api.auth.logout.useMutation({
    onError(error) {
      toast.error("Error", {
        description: getTsRestErrorMessage(error),
      });
    },
    onSuccess() {
      router.push("/auth/login");
    },
  });

  async function handleLogout() {
    await logout({});
  }

  if (!auth) {
    return <div className="p-4">No authenticated user</div>;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">
            Hola, {auth.user.firstName}
          </h1>
          <p className="text-muted-foreground">
            Portal Qodari IAM – aquí irán tus apps, perfil, etc.
          </p>
        </div>

        <Button variant="outline" onClick={handleLogout} disabled={isPending}>
          {isPending ? (
            <span className="flex items-center gap-2">
              <Spinner className="h-4 w-4" />
              Cerrando...
            </span>
          ) : (
            "Cerrar sesión"
          )}
        </Button>
      </header>

      <Card>
        <CardContent className="font-mono text-sm">
          <pre className="mt-6 whitespace-pre-wrap">
            {/* puedes traer más cosas del store si quieres */}
            {JSON.stringify(auth, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Button variant="link" asChild>
        <Link href="/admin">Ir a Admin</Link>
      </Button>
    </div>
  );
}
