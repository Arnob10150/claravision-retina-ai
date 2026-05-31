import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ScanLine, Users, Image, FileText,
  ClipboardList, ChartBar as BarChart3, Settings, Eye, ShieldAlert, Calculator
} from 'lucide-react'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarGroup, SidebarGroupContent, SidebarSeparator,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/useUIStore'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/analyze',      label: 'Analyse Scan', icon: ScanLine },
  { to: '/patients',     label: 'Patients',     icon: Users },
  { to: '/scans',        label: 'Scans',        icon: Image },
  { to: '/reports',      label: 'Reports',      icon: FileText },
  { to: '/review-queue', label: 'Review Queue', icon: ClipboardList },
  { to: '/analytics',        label: 'Analytics',       icon: BarChart3 },
  { to: '/risk-calculator',  label: 'Risk Calculator',  icon: Calculator },
  { to: '/settings',         label: 'Settings',         icon: Settings },
]

const ROLE_LABELS: Record<string, string> = {
  ophthalmologist: 'Ophthalmologist',
  optometrist:     'Optometrist',
  resident:        'Resident',
  researcher:      'Researcher',
  admin:           'Administrator',
}

export function AppSidebar() {
  const location = useLocation()
  const { profile } = useAuthStore()

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'CV'

  const isAdmin = profile?.role === 'admin'

  function NavItem({ to, label, icon: Icon, danger = false }: {
    to: string; label: string; icon: React.ElementType; danger?: boolean
  }) {
    const isActive = location.pathname === to ||
      (to !== '/dashboard' && location.pathname.startsWith(to))
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={label}
          className={cn(
            'relative transition-all duration-150',
            isActive && !danger && [
              'bg-primary/10 text-primary font-medium',
              'before:absolute before:left-0 before:inset-y-1 before:w-0.5 before:rounded-full before:bg-primary',
            ],
            isActive && danger && [
              'bg-destructive/10 text-destructive font-medium',
              'before:absolute before:left-0 before:inset-y-1 before:w-0.5 before:rounded-full before:bg-destructive',
            ],
            !isActive && danger && 'text-destructive/70 hover:text-destructive hover:bg-destructive/8',
          )}
        >
          <NavLink to={to}>
            <Icon className={cn(
              'size-4',
              isActive && !danger ? 'text-primary' : '',
              danger ? 'text-destructive' : '',
            )} />
            <span>{label}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar collapsible="icon">
      {/* Brand header */}
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-8 rounded-lg bg-primary shrink-0">
            <Eye className="size-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold text-sidebar-foreground tracking-tight">ClaraVision</span>
            <span className="text-[10px] text-sidebar-foreground/50 font-medium">Retinal AI · v1.0</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(item => (
                <NavItem key={item.to} {...item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin-only section */}
        {isAdmin && (
          <>
            <SidebarSeparator className="my-2" />
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="px-2 mb-1 group-data-[collapsible=icon]:hidden">
                  <span className="text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest">
                    Admin
                  </span>
                </div>
                <SidebarMenu>
                  <NavItem to="/admin" label="Admin Panel" icon={ShieldAlert} danger />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* User footer */}
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-1 group-data-[collapsible=icon]:justify-center">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || 'Clinician'}
            </span>
            <Badge variant="secondary" className="w-fit mt-0.5 text-[10px] px-1.5 py-0 rounded-full h-4 font-medium">
              {ROLE_LABELS[profile?.role ?? ''] ?? 'Clinician'}
            </Badge>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
