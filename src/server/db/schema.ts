import { relations } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  integer,
  varchar,
  text,
  decimal,
  timestamp,
  boolean,
  index,
  uuid,
  jsonb,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ---------- ENUMS ----------

export const statusEnum = pgEnum('status', ['active', 'suspended']);

export const userStatusEnum = pgEnum('user_status', ['active', 'suspended']);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'trialing',
  'past_due',
  'canceled',
]);

export const clientTypeEnum = pgEnum('client_type', [
  'public', // SPA, móvil
  'confidential', // backend
]);

// ---------- plan ----------

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  key: varchar('key', { length: 45 }).notNull().unique(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  maxApplications: integer('max_applications').notNull(),
  maxUsers: integer('max_users').notNull(),
  ...timestamps,
});

export const plansRelations = relations(plans, ({ many }) => ({
  accounts: many(accounts),
  subscriptions: many(subscriptions),
}));

export type Plan = typeof plans.$inferSelect & {
  accounts?: Account[];
  subscriptions?: Subscription[];
};
export type NewPlan = typeof plans.$inferInsert;

// ---------- accounts ----------

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: varchar('slug', { length: 50 }).notNull().unique(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 45 }),
    logo: text('logo'),
    imageAd: text('image_ad'),
    status: statusEnum('status').default('active').notNull(),
    ...timestamps,
  },
  (table) => [index('fk_accounts_plan_idx').on(table.planId)]
);

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  plan: one(plans, {
    fields: [accounts.planId],
    references: [plans.id],
  }),
  subscriptions: many(subscriptions),
  applications: many(applications),
  userRoles: many(userRoles),
  roles: many(roles),
  permissions: many(permissions),
  authorizationCodes: many(authorizationCodes),
  refreshTokens: many(refreshTokens),
  auditLogs: many(auditLogs),
  apiClients: many(apiClients),
}));

export type Account = typeof accounts.$inferSelect & {
  plan?: Plan;
  subscriptions?: Subscription[];
  applications?: Application[];
  userRoles?: UserRole[];
  roles?: Role[];
  permissions?: Permission[];
  authorizationCodes?: AuthorizationCode[];
  refreshTokens?: RefreshToken[];
  auditLogs?: AuditLog[];
  apiClients?: ApiClient[];
};
export type NewAccount = typeof accounts.$inferInsert;

// ---------- subscriptions ----------

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    status: subscriptionStatusEnum('status').notNull(),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    cancelAt: timestamp('cancel_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('fk_subscriptions_accounts1_idx').on(table.accountId),
    index('fk_subscriptions_plan1_idx').on(table.planId),
  ]
);

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  account: one(accounts, {
    fields: [subscriptions.accountId],
    references: [accounts.id],
  }),
  plan: one(plans, {
    fields: [subscriptions.planId],
    references: [plans.id],
  }),
}));

export type Subscription = typeof subscriptions.$inferSelect & {
  account?: Account;
  plan?: Plan;
};
export type NewSubscription = typeof subscriptions.$inferInsert;

// ---------- users ----------

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    email: varchar('email', { length: 255 }).notNull(),
    firstName: varchar('first_name', { length: 45 }).notNull(),
    lastName: varchar('last_name', { length: 45 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 45 }),
    avatar: text('avatar'),
    status: userStatusEnum('status').notNull().default('active'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    lastLoginIp: varchar('last_login_ip', { length: 45 }),
    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    isAdmin: boolean('is_admin').notNull().default(false),
    emailVerificationToken: varchar('email_verification_token', { length: 255 }),
    emailVerificationExpires: timestamp('email_verification_expires', {
      withTimezone: true,
    }),
    passwordResetToken: varchar('password_reset_token', { length: 255 }),
    passwordResetExpires: timestamp('password_reset_expires', {
      withTimezone: true,
    }),
    ...timestamps,
  },
  (table) => [uniqueIndex('user_account_idx').on(table.accountId, table.email)]
);

export const usersRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
  authorizationCodes: many(authorizationCodes),
  refreshTokens: many(refreshTokens),
  sessions: many(sessions),
  auditLogs: many(auditLogs),
}));

export const USER_SENSITIVE_FIELDS = [
  'passwordHash',
  'emailVerificationToken',
  'passwordResetToken',
] as const;

export type UserSensitiveField = (typeof USER_SENSITIVE_FIELDS)[number];

export type SafeUser = Omit<typeof users.$inferSelect, UserSensitiveField> & {
  userRoles?: UserRole[];
  sessions?: Session[];
  auditLogs?: AuditLog[];
};

export type User = typeof users.$inferSelect & {
  userRoles?: UserRole[];
  authorizationCodes?: AuthorizationCode[];
  refreshTokens?: RefreshToken[];
  sessions?: Session[];
  auditLogs?: AuditLog[];
};
export type NewUser = typeof users.$inferInsert;

// ---------- applications ----------

export const applications = pgTable(
  'applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    logo: text('logo'),
    image: text('image'),
    imageAd: text('image_ad'),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    description: text('description'),
    clientType: clientTypeEnum('client_type').notNull(),
    clientId: text('client_id').notNull().unique(),
    clientSecret: text('client_secret').notNull(),
    clientJwtSecret: text('client_jwt_secret').notNull(),
    homeUrl: varchar('home_url', { length: 255 }),
    logoutUrl: varchar('logout_url', { length: 255 }),
    callbackUrls: text('callback_urls').array().default([]),
    status: statusEnum('status').notNull().default('active'),
    authCodeExp: integer('auth_code_exp').notNull().default(300),
    accessTokenExp: integer('access_token_exp').notNull().default(900),
    refreshTokenExp: integer('refresh_token_exp').notNull().default(604800), // 7 days
    mfaEnabled: boolean('mfa_enabled').notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index('fk_applications_accounts_idx').on(table.accountId),
    uniqueIndex('apps_account_slug_uniq').on(table.accountId, table.slug),
  ]
);

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  account: one(accounts, {
    fields: [applications.accountId],
    references: [accounts.id],
  }),
  roles: many(roles),
  permissions: many(permissions),
  authorizationCodes: many(authorizationCodes),
  refreshTokens: many(refreshTokens),
  auditLogs: many(auditLogs),
}));

export type Application = typeof applications.$inferSelect & {
  account?: Account;
  roles?: Role[];
  permissions?: Permission[];
  authorizationCodes?: AuthorizationCode[];
  refreshTokens?: RefreshToken[];
  auditLogs?: AuditLog[];
};
export type NewApplication = typeof applications.$inferInsert;

// ---------- roles ----------

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    name: varchar('name', { length: 45 }).notNull(),
    slug: varchar('slug', { length: 45 }).notNull(),
    description: text('description'),
    ...timestamps,
  },
  (table) => [
    index('fk_roles_accounts1_idx').on(table.accountId),
    index('fk_roles_applications1_idx').on(table.applicationId),
    uniqueIndex('roles_account_app_slug_uniq').on(table.accountId, table.applicationId, table.slug),
  ]
);

export const rolesRelations = relations(roles, ({ one, many }) => ({
  account: one(accounts, {
    fields: [roles.accountId],
    references: [accounts.id],
  }),
  application: one(applications, {
    fields: [roles.applicationId],
    references: [applications.id],
  }),
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export type Role = typeof roles.$inferSelect & {
  account?: Account;
  application?: Application;
  rolePermissions?: RolePermission[];
  userRoles?: UserRole[];
};
export type NewRole = typeof roles.$inferInsert;

// ---------- permissions ----------

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    name: varchar('name', { length: 45 }).notNull(),
    resource: varchar('resource', { length: 45 }).notNull(),
    action: varchar('action', { length: 45 }).notNull(),
    description: text('description'),
    ...timestamps,
  },
  (table) => [
    index('permissions_name_idx').on(table.name),
    index('fk_permissions_accounts1_idx').on(table.accountId),
    index('fk_permissions_applications1_idx').on(table.applicationId),
    uniqueIndex('permissions_account_app_res_act_uniq').on(
      table.accountId,
      table.applicationId,
      table.resource,
      table.action
    ),
  ]
);

export const permissionsRelations = relations(permissions, ({ one, many }) => ({
  account: one(accounts, {
    fields: [permissions.accountId],
    references: [accounts.id],
  }),
  application: one(applications, {
    fields: [permissions.applicationId],
    references: [applications.id],
  }),
  rolePermissions: many(rolePermissions),
}));

export type Permission = typeof permissions.$inferSelect & {
  account?: Account;
  application?: Application;
  rolePermissions?: RolePermission[];
};
export type NewPermission = typeof permissions.$inferInsert;

// ---------- role_permissions (join) ----------

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
    index('fk_role_permissions_roles1_idx').on(table.roleId),
    index('fk_role_permissions_permissions1_idx').on(table.permissionId),
  ]
);

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export type RolePermission = typeof rolePermissions.$inferSelect & {
  role?: Role;
  permission?: Permission;
};
export type NewRolePermission = typeof rolePermissions.$inferInsert;

// ---------- user_roles (join) ----------

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    index('fk_user_roles_users1_idx').on(table.userId),
    index('fk_user_roles_roles1_idx').on(table.roleId),
  ]
);

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export type UserRole = typeof userRoles.$inferSelect & {
  user?: User;
  role?: Role;
  account?: Account;
};
export type NewUserRole = typeof userRoles.$inferInsert;

// ---------- authorization_codes ----------

export const authorizationCodes = pgTable(
  'authorization_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    code: varchar('code', { length: 255 }).notNull().unique(),
    scope: text('scope'),
    codeChallenge: varchar('code_challenge', { length: 255 }),
    codeChallengeMethod: varchar('code_challenge_method', { length: 10 }), // "S256" | "plain"
    state: varchar('state', { length: 255 }),

    redirectUri: varchar('redirect_uri', { length: 255 }),
    used: boolean('used').notNull().default(false),
    usedAt: timestamp('used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    index('fk_authorization_codes_users1_idx').on(table.userId),
    index('fk_authorization_codes_applications1_idx').on(table.applicationId),
    index('fk_authorization_codes_accounts1_idx').on(table.accountId),
  ]
);

export const authorizationCodesRelations = relations(authorizationCodes, ({ one }) => ({
  user: one(users, {
    fields: [authorizationCodes.userId],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [authorizationCodes.accountId],
    references: [accounts.id],
  }),
  application: one(applications, {
    fields: [authorizationCodes.applicationId],
    references: [applications.id],
  }),
}));

export type AuthorizationCode = typeof authorizationCodes.$inferSelect & {
  user?: User;
  account?: Account;
  application?: Application;
};
export type NewAuthorizationCode = typeof authorizationCodes.$inferInsert;

// ---------- refresh_tokens ----------

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    revokedReason: varchar('revoked_reason', { length: 255 }),

    revoked: boolean('revoked').notNull().default(false),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('fk_refresh_tokens_users_application_idx').on(table.userId, table.applicationId),
    index('fk_refresh_tokens_applications1_idx').on(table.applicationId),
    index('fk_refresh_tokens_accounts1_idx').on(table.accountId),
  ]
);

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [refreshTokens.accountId],
    references: [accounts.id],
  }),
  application: one(applications, {
    fields: [refreshTokens.applicationId],
    references: [applications.id],
  }),
}));

export type RefreshToken = typeof refreshTokens.$inferSelect & {
  user?: User;
  account?: Account;
  application?: Application;
};
export type NewRefreshToken = typeof refreshTokens.$inferInsert;

// ---------- sessions ----------

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    active: boolean('active').notNull().default(true),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index('fk_sessions_users1_idx').on(table.userId)]
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export type Session = typeof sessions.$inferSelect & {
  user?: User;
};
export type NewSession = typeof sessions.$inferInsert;

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    applicationId: uuid('application_id').references(() => applications.id, {
      onDelete: 'set null',
    }),

    action: varchar('action', { length: 100 }).notNull(), // "user.login", "token.issued"
    resource: varchar('resource', { length: 100 }), // "user", "application"
    resourceId: varchar('resource_id', { length: 255 }),

    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),

    status: varchar('status', { length: 20 }).notNull(), // "success", "failure"
    errorMessage: text('error_message'),
    metadata: jsonb('metadata'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_account_idx').on(table.accountId),
    index('audit_user_idx').on(table.userId),
    index('audit_action_idx').on(table.action),
    index('audit_created_idx').on(table.createdAt),
  ]
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  account: one(accounts, {
    fields: [auditLogs.accountId],
    references: [accounts.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  application: one(applications, {
    fields: [auditLogs.applicationId],
    references: [applications.id],
  }),
}));

export type AuditLog = typeof auditLogs.$inferSelect & {
  account?: Account;
  user?: User;
  application?: Application;
};
export type NewAuditLog = typeof auditLogs.$inferInsert;

export const rateLimits = pgTable(
  'rate_limits',
  {
    key: varchar('key', { length: 255 }).primaryKey(),
    windowStart: timestamp('window_start').notNull(),
    count: integer('count').notNull().default(1),
    ...timestamps,
  },
  (table) => [index('window_start_idx').on(table.windowStart)]
);

export type RateLimit = typeof rateLimits.$inferSelect;
export type NewRateLimit = typeof rateLimits.$inferInsert;

// ---------- mfa_pending ----------

export const mfaPending = pgTable(
  'mfa_pending',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    codeHash: varchar('code_hash', { length: 255 }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    index('mfa_pending_user_idx').on(table.userId),
    index('mfa_pending_expires_idx').on(table.expiresAt),
  ]
);

export const mfaPendingRelations = relations(mfaPending, ({ one }) => ({
  user: one(users, {
    fields: [mfaPending.userId],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [mfaPending.accountId],
    references: [accounts.id],
  }),
  application: one(applications, {
    fields: [mfaPending.applicationId],
    references: [applications.id],
  }),
}));

export type MfaPending = typeof mfaPending.$inferSelect & {
  user?: User;
  account?: Account;
  application?: Application;
};
export type NewMfaPending = typeof mfaPending.$inferInsert;

// ---------- api_clients ----------

export const apiClients = pgTable(
  'api_clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    clientId: text('client_id').notNull().unique(),
    clientSecretHash: text('client_secret_hash').notNull(),
    status: statusEnum('status').default('active').notNull(),
    accessTokenExp: integer('access_token_exp').notNull().default(600), // 10 min
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('api_clients_account_idx').on(table.accountId),
    index('api_clients_client_id_idx').on(table.clientId),
  ]
);

export const apiClientsRelations = relations(apiClients, ({ one, many }) => ({
  account: one(accounts, {
    fields: [apiClients.accountId],
    references: [accounts.id],
  }),
  roles: many(apiClientRoles),
}));

export type ApiClient = typeof apiClients.$inferSelect & {
  account?: Account;
  roles?: ApiClientRole[];
};
export type NewApiClient = typeof apiClients.$inferInsert;

// ---------- api_client_roles (join) ----------

export const apiClientRoles = pgTable(
  'api_client_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    apiClientId: uuid('api_client_id')
      .notNull()
      .references(() => apiClients.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    index('api_client_roles_client_idx').on(table.apiClientId),
    index('api_client_roles_role_idx').on(table.roleId),
    uniqueIndex('api_client_roles_uniq').on(table.apiClientId, table.roleId),
  ]
);

export const apiClientRolesRelations = relations(apiClientRoles, ({ one }) => ({
  apiClient: one(apiClients, {
    fields: [apiClientRoles.apiClientId],
    references: [apiClients.id],
  }),
  role: one(roles, {
    fields: [apiClientRoles.roleId],
    references: [roles.id],
  }),
}));

export type ApiClientRole = typeof apiClientRoles.$inferSelect & {
  apiClient?: ApiClient;
  role?: Role;
};
export type NewApiClientRole = typeof apiClientRoles.$inferInsert;
