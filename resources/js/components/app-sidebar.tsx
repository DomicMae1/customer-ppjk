import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Bell, BookCheck, BookUser, Building2, KeyRound, PackageCheck, Shield, SquareLibrary, SquareUserRound, Users } from 'lucide-react';
import AppLogo from './app-logo';

// interface ExtendedNavItem extends NavItem {
//     supervisorManagerOnly?: boolean;
// }

interface SharedProps extends PageProps {
    trans_nav: Record<string, string>;
}

export function AppSidebar() {
    const { auth, trans_nav } = usePage<SharedProps>().props;

    const mainNavItems: any[] = [
        {
            title: trans_nav.shipment,
            url: '/shipping',
            icon: SquareUserRound,
            permission: 'view-master-shipping',
        },
        {
            title: trans_nav.manage_customer,
            url: '/customer',
            icon: BookUser,
            permission: 'view-customer',
        },
        {
            title: trans_nav.manage_users,
            url: '/users',
            icon: Users,
            permission: 'view-user',
        },
        {
            title: trans_nav.manage_document,
            url: '/document',
            icon: BookCheck,
            permission: 'view-document',
        },
        {
            title: trans_nav.manage_section,
            url: '/section',
            icon: SquareLibrary,
            permission: 'view-section', // Sesuaikan jika ada permission khusus section
        },
        {
            title: 'Master Package Shipping',
            url: '/shipping-packages',
            icon: PackageCheck,
            permission: 'view-shipping-package',
        },
        {
            title: trans_nav.manage_role,
            url: '/role-manager',
            icon: Shield,
            permission: 'view-role',
        },
        {
            title: trans_nav.manage_company,
            url: '/perusahaan',
            icon: Building2,
            permission: 'view-role', // Sesuaikan jika ada permission khusus perusahaan
        },
        {
            title: 'Notification Settings',
            url: '/notification-settings',
            icon: Bell,
            permission: 'view-role', // Restricting it with view-role for admin as other admin pages use this
        },
        {
            title: 'CEISA Settings',
            url: '/ceisa-settings',
            icon: KeyRound,
            permission: 'view-role',
        },
    ];

    const userPermissions = auth?.user?.permissions || [];

    const hasPermission = (perm?: string) => {
        if (!perm) return true; // Jika tidak ada syarat permission, tampilkan
        return userPermissions.includes(perm);
    };

    const filteredNavItems = mainNavItems
        .filter((item) => hasPermission(item.permission))
        .map((item) => {
            if (item.subItems) {
                const filteredSubItems = item.subItems.filter((sub: any) => hasPermission(sub.permission));
                return { ...item, subItems: filteredSubItems };
            }
            return item;
        });

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/shipping" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={filteredNavItems} />
            </SidebarContent>

            <SidebarFooter>
                {/* <NavFooter items={footerNavItems} className="mt-auto" /> */}
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
