import { CreateUserBodySchema } from '@/schemas/user';
import { useFormContext } from 'react-hook-form';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateUserBodySchema>;

export function UserRolesForm() {
  const form = useFormContext<FormValues>();
  return <div>Roles</div>;
}
