import { contract } from '@/server/api/contracts';
import { createNextHandler } from '@ts-rest/serverless/next';
import { auth } from './auth';
import { user } from './user';
import { role } from './role';

export const handler = createNextHandler(
  contract,
  { auth, role, user },
  {
    jsonQuery: true,
    responseValidation: true,
    handlerType: 'app-router',
  }
);
