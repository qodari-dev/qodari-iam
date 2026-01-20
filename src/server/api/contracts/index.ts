import { initContract } from '@ts-rest/core';
import { account } from './account';
import { apiClient } from './api-client';
import { audit } from './audit';
import { auth } from './auth';
import { user } from './user';
import { role } from './role';
import { application } from './application';
import { upload } from './upload';

const c = initContract();

export const contract = c.router(
  {
    account,
    apiClient,
    audit,
    auth,
    user,
    role,
    application,
    upload,
  },
  {
    pathPrefix: '/api/v1',
  }
);

export type Contract = typeof contract;
