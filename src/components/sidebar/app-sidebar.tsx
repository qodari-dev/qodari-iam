'use client';

import { AppWindowMacIcon, Key, ScrollText, Settings, ShieldCheck, Users } from 'lucide-react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { NavHeader } from '@/components/sidebar/nav-header';
import { NavMain } from '@/components/sidebar/nav-main';
import { NavUser } from '@/components/sidebar/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { useI18n } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import { useAuthUser, useHasPermission } from '@/stores/auth-store-provider';
import companyLogo from '../../../public/iam-logo.png';

function AppLogo({ className }: { className?: string }) {
  return (
    <Image
      src={companyLogo}
      alt="Qodari IAM logo"
      className={cn('object-contain', className)}
      sizes="32px"
      priority
    />
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { messages } = useI18n();
  const user = useAuthUser();
  const pathname = usePathname();
  const canSeeUsers = useHasPermission('users:read');
  const canSeeApplications = useHasPermission('applications:read');
  const canSeeRoles = useHasPermission('roles:read');
  const canSeeApiClients = useHasPermission('api-clients:read');
  const canSeeAuditLogs = useHasPermission('audit:read');

  // Extract accountSlug from pathname (e.g., /acme/admin/users -> acme)
  const accountSlug = pathname.split('/')[1];

  const data = React.useMemo(() => {
    return {
      user: {
        name: `${user?.firstName} ${user?.lastName}`,
        email: user?.email ?? '',
        avatar: `${user?.firstName[0]}${user?.lastName[0]}`,
      },
      app: {
        name: 'IAM',
        Logo: AppLogo,
        url: `/${accountSlug}/admin`,
      },
      navMain: [
        {
          title: messages.navigation.main,
          items: [
            ...(canSeeUsers
              ? [
                  {
                    title: messages.navigation.users,
                    url: `/${accountSlug}/admin/users`,
                    icon: Users,
                  },
                ]
              : []),
            ...(canSeeApplications
              ? [
                  {
                    title: messages.navigation.applications,
                    url: `/${accountSlug}/admin/applications`,
                    icon: AppWindowMacIcon,
                  },
                ]
              : []),
            ...(canSeeRoles
              ? [
                  {
                    title: messages.navigation.roles,
                    url: `/${accountSlug}/admin/roles`,
                    icon: ShieldCheck,
                  },
                ]
              : []),
            ...(canSeeApiClients
              ? [
                  {
                    title: messages.navigation.apiClients,
                    url: `/${accountSlug}/admin/api-clients`,
                    icon: Key,
                  },
                ]
              : []),
            ...(canSeeAuditLogs
              ? [
                  {
                    title: messages.navigation.auditLogs,
                    url: `/${accountSlug}/admin/audit`,
                    icon: ScrollText,
                  },
                ]
              : []),
            ...(user?.isAdmin
              ? [
                  {
                    title: messages.navigation.settings,
                    url: `/${accountSlug}/admin/settings`,
                    icon: Settings,
                  },
                ]
              : []),
          ],
        },
      ],
    };
  }, [
    user,
    accountSlug,
    canSeeUsers,
    canSeeApplications,
    canSeeRoles,
    canSeeApiClients,
    canSeeAuditLogs,
    messages,
  ]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <NavHeader {...data.app} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain menus={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
