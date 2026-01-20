import { contract } from '@/server/api/contracts';
import { createNextHandler } from '@ts-rest/serverless/next';
import { account } from './account';
import { apiClient } from './api-client';
import { audit } from './audit';
import { auth } from './auth';
import { user } from './user';
import { role } from './role';
import { application } from './application';
import { upload } from './upload';

export const handler = createNextHandler(
  contract,
  { account, apiClient, audit, auth, role, user, application, upload },
  {
    jsonQuery: true,
    responseValidation: true,
    handlerType: 'app-router',
  }
);
