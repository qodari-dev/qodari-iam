'use client';

import { AudioWaveform, GalleryVerticalEnd, Settings2 } from 'lucide-react';
import * as React from 'react';

import { NavMain } from '@/components/sidebar/nav-main';
import { NavUser } from '@/components/sidebar/nav-user';
import { TeamSwitcher } from '@/components/sidebar/team-switcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { useAuthUser, useHasPermission } from '@/stores/auth-store-provider';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useAuthUser();
  const canSeeUsers = useHasPermission('users:read');
  const canSeeApplications = useHasPermission('applications:read');
  const canSeeRoles = useHasPermission('roles:read');

  const data = React.useMemo(() => {
    return {
      user: {
        name: `${user?.firstName} ${user?.lastName}`,
        email: user?.email ?? '',
        avatar: '/avatars/shadcn.jpg',
      },
      teams: [
        {
          name: 'Acme Inc',
          logo: GalleryVerticalEnd,
          plan: 'Enterprise',
        },
        {
          name: 'Acme Corp.',
          logo: AudioWaveform,
          plan: 'Startup',
        },
      ],
      navMain: [
        {
          title: 'Settings',
          url: '#',
          icon: Settings2,
          isActive: true,
          items: [
            ...(canSeeUsers
              ? [
                  {
                    title: 'Users',
                    url: '/admin/users',
                  },
                ]
              : []),
            ...(canSeeApplications
              ? [
                  {
                    title: 'Applications',
                    url: '/admin/applications',
                  },
                ]
              : []),
            ...(canSeeRoles
              ? [
                  {
                    title: 'Roles',
                    url: '/admin/roles',
                  },
                ]
              : []),
          ],
        },
      ],
    };
  }, [user, canSeeUsers, canSeeApplications, canSeeRoles]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
