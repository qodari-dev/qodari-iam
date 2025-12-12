import { initContract } from '@ts-rest/core';
import { auth } from './auth';

const c = initContract();

export const contract = c.router(
  {
    auth,
  },
  {
    pathPrefix: '/api/v1',
    baseHeaders: c.type<{ cookie?: string | null }>(),
  }
);

export type Contract = typeof contract;
