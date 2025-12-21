import { initContract } from '@ts-rest/core';
import { auth } from './auth';
import { user } from './user';
import { role } from './role';

const c = initContract();

export const contract = c.router(
  {
    auth,
    user,
    role,
  },
  {
    pathPrefix: '/api/v1',
  }
);

export type Contract = typeof contract;
