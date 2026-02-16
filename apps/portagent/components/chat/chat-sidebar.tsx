"use client";

import {
  BotIcon,
  LayoutGridIcon,
  LogOutIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PinIcon,
  PlusIcon,
  SettingsIcon,
  ShieldIcon,
  StarIcon,
  TicketIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { Session, User } from "./types";

interface ChatSidebarProps {
  user: User;
  sessions: Session[];
  activeSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onPinSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
}

export function ChatSidebar({
  user,
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onPinSession,
  onRenameSession,
}: ChatSidebarProps) {
  const router = useRouter();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const startRename = (session: Session) => {
    setEditingId(session.id);
    setEditValue(session.title);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commitRename = () => {
    if (editingId && editValue.trim()) {
      onRenameSession(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const getSessionPreview = (session: Session): string => {
    const lastMsg = session.messages.filter((m) => !m.tool).at(-1);
    if (!lastMsg) return "";
    return lastMsg.content.slice(0, 50);
  };

  return (
    <Sidebar data-testid="sidebar" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
          <BotIcon className="size-5 shrink-0 text-primary group-data-[collapsible=icon]:hidden" />
          <span className="font-semibold text-base truncate group-data-[collapsible=icon]:hidden">
            Portagent
          </span>
          <SidebarTrigger className="ml-auto shrink-0 group-data-[collapsible=icon]:ml-0" />
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onNewChat}>
                  <PlusIcon className="size-4" />
                  <span>New Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <StarIcon className="size-4" />
                  <span>Favorites</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <LayoutGridIcon className="size-4" />
                  <span>Resources</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="group-data-[collapsible=icon]:hidden" />

        <SidebarGroup className="pt-4 group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>History</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sessions.map((session) => {
                const preview = getSessionPreview(session);
                const isEditing = editingId === session.id;

                return (
                  <SidebarMenuItem key={session.id} className="group/session">
                    <SidebarMenuButton
                      isActive={session.id === activeSessionId}
                      onClick={() => !isEditing && onSelectSession(session.id)}
                      className="h-auto py-2 items-start"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 w-full">
                        {isEditing ? (
                          <input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename();
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="text-sm bg-transparent border-b border-primary outline-none w-full"
                          />
                        ) : (
                          <div className="flex items-center gap-1 min-w-0">
                            {session.pinned && (
                              <PinIcon className="size-3 shrink-0 text-muted-foreground" />
                            )}
                            <span className="truncate text-sm">{session.title}</span>
                          </div>
                        )}
                        {!isEditing && preview && (
                          <span className="truncate text-xs text-muted-foreground">{preview}</span>
                        )}
                      </div>
                    </SidebarMenuButton>

                    {!isEditing && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/session:opacity-100 p-1 rounded hover:bg-accent text-muted-foreground transition-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => onPinSession(session.id)}>
                            <PinIcon className="size-4 mr-2" />
                            {session.pinned ? "Unpin" : "Pin to Top"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => startRename(session)}>
                            <PencilIcon className="size-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDeleteSession(session.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2Icon className="size-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        {user.role === "admin" && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>
                <ShieldIcon className="size-4" />
                <span>Admin</span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => router.push("/admin/invites")}>
                      <TicketIcon className="size-4" />
                      <span>Invite Codes</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => router.push("/admin/settings")}>
                      <SettingsIcon className="size-4" />
                      <span>Settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarSeparator />
          </>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="cursor-default hover:bg-transparent">
                  <UserIcon className="size-4" />
                  <span className="truncate">{user.email}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout}>
                  <LogOutIcon className="size-4" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
