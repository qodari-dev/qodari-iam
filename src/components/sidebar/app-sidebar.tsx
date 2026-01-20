'use client';

import { AppWindowMacIcon, Download, Key, ScrollText, Settings, ShieldCheck, Users } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useAuthUser, useHasPermission } from '@/stores/auth-store-provider';
import companyLogo from '../../../public/company-logo.png';

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
          title: 'Principal',
          items: [
            ...(canSeeUsers
              ? [
                  {
                    title: 'Users',
                    url: `/${accountSlug}/admin/users`,
                    icon: Users,
                  },
                ]
              : []),
            ...(canSeeApplications
              ? [
                  {
                    title: 'Applications',
                    url: `/${accountSlug}/admin/applications`,
                    icon: AppWindowMacIcon,
                  },
                ]
              : []),
            ...(canSeeRoles
              ? [
                  {
                    title: 'Roles',
                    url: `/${accountSlug}/admin/roles`,
                    icon: ShieldCheck,
                  },
                ]
              : []),
            ...(canSeeApiClients
              ? [
                  {
                    title: 'API Clients',
                    url: `/${accountSlug}/admin/api-clients`,
                    icon: Key,
                  },
                ]
              : []),
            ...(canSeeAuditLogs
              ? [
                  {
                    title: 'Audit Logs',
                    url: `/${accountSlug}/admin/audit`,
                    icon: ScrollText,
                  },
                ]
              : []),
            ...(user?.isAdmin
              ? [
                  {
                    title: 'Settings',
                    url: `/${accountSlug}/admin/settings`,
                    icon: Settings,
                  },
                ]
              : []),
          ],
        },
        {
          title: 'Reportes',
          items: [
            {
              title: 'Reports',
              icon: Download,
              isActive: pathname.startsWith(`/${accountSlug}/admin/reports`),
              items: [
                {
                  title: 'Permisos por aplicación',
                  url: `/${accountSlug}/admin/reports/permissions-by-application`,
                },
              ],
            },
          ],
        },
      ],
    };
  }, [user, pathname, accountSlug, canSeeUsers, canSeeApplications, canSeeRoles, canSeeApiClients, canSeeAuditLogs]);

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
