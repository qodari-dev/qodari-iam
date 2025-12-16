import { initContract } from '@ts-rest/core';
import { auth } from './auth';
import { user } from './user';

const c = initContract();

export const contract = c.router(
  {
    auth,
    user,
  },
  {
    pathPrefix: '/api/v1',
  }
);

export type Contract = typeof contract;
