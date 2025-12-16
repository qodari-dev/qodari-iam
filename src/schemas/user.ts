import {
  BooleanOperatorsSchema,
  createIncludeSchema,
  createListQuerySchema,
  createSortSchema,
  createWhereSchema,
  DateOperatorsSchema,
  EnumOperatorsSchema,
  StringOperatorsSchema,
  UUIDOperatorsSchema,
} from '@/server/utils/query/schemas';
import { z } from 'zod';

// ============================================
// CONSTANTES Y ENUMS
// ============================================

export const USER_STATUS = ['active', 'suspended', 'pending_verification'] as const;
export const UserStatusEnum = z.enum(USER_STATUS);
export type UserStatus = z.infer<typeof UserStatusEnum>;

// ============================================
// WHERE
// ============================================

export const UserWhereFieldsSchema = z
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

export const UserWhereSchema = createWhereSchema(UserWhereFieldsSchema);
export type UserWhere = z.infer<typeof UserWhereSchema>;

// ============================================
// SORT
// ============================================

export const USER_SORT_FIELDS = [
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

export const UserSortSchema = createSortSchema(USER_SORT_FIELDS, { max: 3 });
export type UserSort = z.infer<typeof UserSortSchema>;

// ============================================
// INCLUDE
// ============================================

export const USER_INCLUDE_OPTIONS = ['roles', 'accounts', 'sessions', 'auditLogs'] as const;
export type UserIncludeOption = (typeof USER_INCLUDE_OPTIONS)[number];

export const UserIncludeSchema = createIncludeSchema(USER_INCLUDE_OPTIONS);
export type UserInclude = z.infer<typeof UserIncludeSchema>;

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

export type GetUserQuery = z.infer<typeof GetUserQuerySchema>;

// ============================================
// MUTATIONS
// ============================================

export const CreateUserBodySchema = z.object({
  email: z.string().email('Invalid email'),
  firstName: z.string().min(1, 'First name required').max(45),
  lastName: z.string().min(1, 'Last name required').max(45),
  password: z.string().min(8, 'Minimum 8 characters'),
  phone: z.string().max(45).optional(),
  isAdmin: z.boolean().default(false),
  status: UserStatusEnum.default('pending_verification'),
});

export type CreateUserBody = z.infer<typeof CreateUserBodySchema>;

export const UpdateUserBodySchema = CreateUserBodySchema.omit({
  email: true,
  password: true,
}).partial();

export type UpdateUserBody = z.infer<typeof UpdateUserBodySchema>;

export const SetUserPasswordBodySchema = z.object({
  password: z.string().min(8, 'Minimum 8 characters'),
});

export type SetUserPasswordBody = z.infer<typeof SetUserPasswordBodySchema>;
