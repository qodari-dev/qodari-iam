import {
  PresignUploadBodySchema,
  PresignUploadResponseSchema,
  DeleteUploadBodySchema,
} from '@/schemas/upload';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

export const upload = c.router(
  {
    presign: {
      method: 'POST',
      path: '/presign',
      body: PresignUploadBodySchema,
      metadata: {
        auth: 'required',
      } satisfies TsRestMetaData,
      responses: {
        200: PresignUploadResponseSchema,
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    delete: {
      method: 'DELETE',
      path: '/',
      body: DeleteUploadBodySchema,
      metadata: {
        auth: 'required',
      } satisfies TsRestMetaData,
      responses: {
        200: z.object({ success: z.boolean() }),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/upload' }
);
