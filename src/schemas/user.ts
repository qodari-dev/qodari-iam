import { Contract } from '@/server/api/contracts';
import {
  BooleanOperatorsSchema,
  createIncludeSchema,
  createListQuerySchema,
  DateOperatorsSchema,
  EnumOperatorsSchema,
  StringOperatorsSchema,
  UUIDOperatorsSchema,
} from '@/server/utils/query/schemas';
import { ClientInferResponseBody } from '@ts-rest/core';
import { z } from 'zod';

// ============================================
// SCHEMAS
// ============================================

// ============================================
// CONSTANTES Y ENUMS
// ============================================

export const userStatusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Pending Verification', value: 'pending_verification' },
] as const;

const USER_STATUS = ['active', 'suspended', 'pending_verification'] as const;
const UserStatusEnum = z.enum(USER_STATUS);
export type UserStatus = z.infer<typeof UserStatusEnum>;

// ============================================
// WHERE
// ============================================

const UserWhereFieldsSchema = z
  .object({
    id: z.union([z.string().uuid(), UUIDOperatorsSchema]).optional(),
    email: z.union([z.string().email(), StringOperatorsSchema]).optional(),
    firstName: z.union([z.string().min(1), StringOperatorsSchema]).optional(),
    lastName: z.union([z.string().min(1), StringOperatorsSchema]).optional(),
    status: z.union([UserStatusEnum, EnumOperatorsSchema(USER_STATUS)]).optional(),
    isAdmin: z.union([z.boolean(), BooleanOperatorsSchema]).optional(),
    createdAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    updatedAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
    lastLoginAt: z.union([z.coerce.date(), DateOperatorsSchema]).optional(),
  })
  .strict();

// ============================================
// SORT
// ============================================

const USER_SORT_FIELDS = [
  'id',
  'email',
  'firstName',
  'lastName',
  'status',
  'isAdmin',
  'createdAt',
  'updatedAt',
  'lastLoginAt',
] as const;

// ============================================
// INCLUDE
// ============================================

const USER_INCLUDE_OPTIONS = ['roles', 'accounts', 'sessions', 'auditLogs'] as const;
const UserIncludeSchema = createIncludeSchema(USER_INCLUDE_OPTIONS);

// ============================================
// QUERY SCHEMAS
// ============================================

export const ListUsersQuerySchema = createListQuerySchema({
  whereFields: UserWhereFieldsSchema,
  sortFields: USER_SORT_FIELDS,
  includeFields: USER_INCLUDE_OPTIONS,
  sortMax: 3,
});

export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

export const GetUserQuerySchema = z.object({
  include: UserIncludeSchema,
});

// ============================================
// MUTATIONS
// ============================================

export const CreateUserBodySchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(45),
  lastName: z.string().min(1).max(45),
  password: z.string().min(8),
  phone: z.string().max(45).optional(),
  isAdmin: z.boolean(),
  status: UserStatusEnum,
});

export const UpdateUserBodySchema = CreateUserBodySchema.omit({
  email: true,
  password: true,
}).partial();

export const SetUserPasswordBodySchema = z.object({
  password: z.string().min(8),
});

// ============================================
// TYPES
// ============================================

//export const UserWhereSchema = createWhereSchema(UserWhereFieldsSchema);
//export type UserWhere = z.infer<typeof UserWhereSchema>;
//export const UserSortSchema = createSortSchema(USER_SORT_FIELDS, { max: 3 });
//export type UserSort = z.infer<typeof UserSortSchema>;
//export type UserIncludeOption = (typeof USER_INCLUDE_OPTIONS)[number];
//export type UserInclude = z.infer<typeof UserIncludeSchema>;
//export type GetUserQuery = z.infer<typeof GetUserQuerySchema>;
//export type CreateUserBody = z.infer<typeof CreateUserBodySchema>;
//export type UpdateUserBody = z.infer<typeof UpdateUserBodySchema>;
//export type SetUserPasswordBody = z.infer<typeof SetUserPasswordBodySchema>;

export type UserPaginated = ClientInferResponseBody<Contract['user']['list'], 200>;

export type User = UserPaginated['data'][number];

export type UserSortField = (typeof USER_SORT_FIELDS)[number];
export type UserInclude = (typeof USER_INCLUDE_OPTIONS)[number];
