'use client';

import { Field, FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { CreateRoleBodySchema } from '@/schemas/role';
import { useApplication } from '@/hooks/queries/use-application-queries';
import { useEffect, useMemo } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateRoleBodySchema>;

export function RolePermissionsForm() {
  const form = useFormContext<FormValues>();
  const selectedAppId = form.watch('applicationId');

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'permissions',
  });

  useEffect(() => {
    replace([]);
  }, [selectedAppId, replace]);

  const selectedIds = useMemo(() => new Set(fields.map((f) => f.permissionId)), [fields]);

  const { data: appData, isLoading } = useApplication(selectedAppId, {
    enabled: !!selectedAppId,
  });
  const permissions = appData?.body?.permissions ?? [];

  const togglePermission = (id: string) => {
    if (selectedIds.has(id)) {
      replace(fields.filter((f) => f.permissionId !== id));
    } else {
      replace([...fields, { permissionId: id }]);
    }
  };

  if (!selectedAppId) {
    return (
      <div className={cn('text-muted-foreground rounded-md border border-dashed p-4 text-sm')}>
        Selecciona una aplicación para ver sus permisos.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Field>
        <FieldLabel>Permisos de la aplicación</FieldLabel>
        <div className="rounded-md border">
          {isLoading ? (
            <div className="text-muted-foreground p-3 text-sm">Cargando permisos...</div>
          ) : permissions.length === 0 ? (
            <div className="text-muted-foreground p-3 text-sm">No hay permisos configurados.</div>
          ) : (
            <div className="divide-y">
              {permissions.map((perm) => (
                <label
                  key={perm.id}
                  className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 px-3 py-2"
                >
                  <Switch
                    checked={selectedIds.has(perm.id)}
                    onCheckedChange={() => togglePermission(perm.id)}
                    className="mt-1"
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{perm.name}</span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {perm.resource}:{perm.action}
                    </span>
                    {perm.description && (
                      <span className="text-muted-foreground text-xs">{perm.description}</span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </Field>
    </div>
  );
}
