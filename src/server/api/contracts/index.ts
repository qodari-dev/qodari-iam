import { initContract } from '@ts-rest/core';
import { auth } from './auth';
import { user } from './user';
import { role } from './role';
import { application } from './application';

const c = initContract();

export const contract = c.router(
  {
    auth,
    user,
    role,
    application,
  },
  {
    pathPrefix: '/api/v1',
  }
);

export type Contract = typeof contract;
