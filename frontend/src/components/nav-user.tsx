import { LogOutIcon, MoreVerticalIcon, ShieldCheckIcon } from "lucide-react";

import { useCryptoSpike } from "@/context/trading-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavUser() {
  const { isMobile } = useSidebar();
  const { user, logout } = useCryptoSpike();

  const username = user?.username || "Lead Operator";
  const role = user?.role || "ADMIN";
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer hover:bg-muted/60 transition-colors"
            >
              <Avatar className="size-8 rounded-lg bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center">
                <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold capitalize">
                  {username}
                </span>
                <span className="truncate text-xs text-muted-foreground font-mono">
                  Role: {role}
                </span>
              </div>
              <MoreVerticalIcon className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center">
                  <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold capitalize">
                    {username}
                  </span>
                  <span className="truncate text-xs text-muted-foreground font-mono">
                    Role: {role}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2 text-xs">
                <ShieldCheckIcon className="size-4 text-emerald-600" />
                <span>Status: Terproteksi JWT</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 font-medium text-xs"
              onClick={() => {
                if (
                  window.confirm(
                    "Apakah Anda yakin ingin keluar dari sesi operator?",
                  )
                ) {
                  logout();
                }
              }}
            >
              <LogOutIcon className="size-4" />
              Keluar (Log out)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
