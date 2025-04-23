"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MessageSquare, PlusCircle, Trash2, ServerIcon, Settings, Loader2, Sparkles, ChevronsUpDown, UserIcon, Copy, Pencil, Github, KeyRound } from "lucide-react";
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
    SidebarMenuBadge,
    useSidebar
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Image from "next/image";
import { MCPServerManager } from "./mcp-server-manager";
import { ThemeToggle } from "./theme-toggle";
import { getUserId, updateUserId } from "@/lib/user-id";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { STORAGE_KEYS } from "@/lib/constants";
import { useChats } from "@/lib/hooks/use-chats";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMCP } from "@/lib/context/mcp-context";
import { useApiKey } from "../lib/hooks/use-api-key";

export function ChatSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const { state, open, setOpen } = useSidebar();
    const [userId, setUserId] = useState('');
    const [newUserId, setNewUserId] = useState('');
    const [editUserIdOpen, setEditUserIdOpen] = useState(false);
    const [mcpSettingsOpen, setMcpSettingsOpen] = useState(false);
    const { mcpServers, setMcpServers, selectedMcpServers, setSelectedMcpServers } = useMCP();
    const listRef = useRef<HTMLDivElement>(null);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const { apiKey, customModelName, setApiKey: saveApiKeyData, clearApiKey } = useApiKey();
    const [isApiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
    const [apiKeyInputValue, setApiKeyInputValue] = useState('');
    const [modelNameInputValue, setModelNameInputValue] = useState('');

    useEffect(() => {
        const currentUserId = getUserId();
        setUserId(currentUserId);
    }, []);
    
    const { isLoading, deleteChat, refreshChats, chats } = useChats(userId);

    useEffect(() => {
        const match = pathname.match(/^\/chat\/([^\/]+)/);
        setActiveChatId(match ? match[1] : null);
    }, [pathname]);

    const handleNewChat = () => {
        router.push('/');
    };

    const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        await deleteChat(chatId);
        if (activeChatId === chatId) {
            router.push('/');
        }
    };

    const activeServersCount = selectedMcpServers.length;

    const handleUpdateUserId = async () => {
        const trimmedUserId = newUserId.trim();
        if (!trimmedUserId) {
            toast.error("User ID cannot be empty.");
            return;
        }
        updateUserId(trimmedUserId);
        setEditUserIdOpen(false);
        toast.success("User ID updated. Reloading page...");
        setTimeout(() => window.location.reload(), 1000);
    };

    const handleSaveApiKey = () => {
        saveApiKeyData({
            key: apiKeyInputValue.trim(),
            modelName: modelNameInputValue.trim() || null
        });
        setApiKeyDialogOpen(false);
        toast.success("API Key saved successfully.");
    };

    const handleClearApiKey = () => {
        clearApiKey();
        setApiKeyInputValue('');
        setModelNameInputValue('');
        toast.success("API Key cleared successfully.");
    };

    useEffect(() => {
        if (isApiKeyDialogOpen) {
            setApiKeyInputValue(apiKey || '');
            setModelNameInputValue(customModelName || '');
        }
    }, [isApiKeyDialogOpen, apiKey, customModelName]);

    if (!userId) {
        return null;
    }

    return (
        <Sidebar className="shadow-sm bg-background/80 dark:bg-background/40 backdrop-blur-md" collapsible="icon">
            <SidebarHeader className="p-4 border-b border-border/40">
                <div className="flex items-center justify-start">
                    <div className={`flex items-center gap-2 ${state === "collapsed" ? "justify-center w-full" : ""}`}>
                        <div className={`relative rounded-full bg-primary/70 flex items-center justify-center ${state === "collapsed" ? "size-5 p-3" : "size-6"}`}>
                            <Image src="/scira.png" alt="Scira Logo" width={24} height={24} className="absolute transform scale-75" unoptimized quality={100} />
                        </div>
                        {state !== "collapsed" && (
                            <div className="font-semibold text-lg text-foreground/90">MCP</div>
                        )}
                    </div>
                </div>
            </SidebarHeader>
            
            <SidebarContent className="flex flex-col h-[calc(100vh-8rem)]">
                <SidebarGroup className="flex-1 min-h-0">
                    <SidebarGroupLabel className={cn(
                        "px-4 text-xs font-medium text-muted-foreground/80 uppercase tracking-wider",
                        state === "collapsed" ? "sr-only" : ""
                    )}>
                        Chats
                    </SidebarGroupLabel>
                    <SidebarGroupContent className={cn(
                        "overflow-y-auto pt-1",
                        state === "collapsed" ? "overflow-x-hidden" : ""
                    )}>
                        <SidebarMenu>
                            {isLoading ? (
                                <div className={`flex items-center justify-center py-4 ${state === "collapsed" ? "" : "px-4"}`}>
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    {state !== "collapsed" && (
                                        <span className="ml-2 text-xs text-muted-foreground">Loading...</span>
                                    )}
                                </div>
                            ) : chats.length === 0 ? (
                                <div className={`flex items-center justify-center py-3 ${state === "collapsed" ? "" : "px-4"}`}>
                                    {state === "collapsed" ? (
                                        <div className="flex h-6 w-6 items-center justify-center rounded-md border border-border/50 bg-background/50">
                                            <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 w-full px-3 py-2 rounded-md border border-dashed border-border/50 bg-background/50">
                                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground font-normal">No conversations yet</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                chats.map((chat) => (
                                    <SidebarMenuItem key={chat.id}>
                                        <SidebarMenuButton 
                                            asChild
                                            tooltip={state === "collapsed" ? chat.title : undefined}
                                            data-active={pathname === `/chat/${chat.id}`}
                                            className={cn(
                                                "transition-all hover:bg-primary/10 active:bg-primary/15",
                                                pathname === `/chat/${chat.id}` ? "bg-secondary/60 hover:bg-secondary/60" : ""
                                            )}
                                        >
                                            <Link
                                                href={`/chat/${chat.id}`}
                                                className="flex items-center justify-between w-full gap-1"
                                            >
                                                <div className="flex items-center min-w-0 overflow-hidden flex-1 pr-2">
                                                    <MessageSquare className={cn(
                                                        "h-4 w-4 flex-shrink-0",
                                                        pathname === `/chat/${chat.id}` ? "text-foreground" : "text-muted-foreground"
                                                    )} />
                                                    {state !== "collapsed" && (
                                                        <span className={cn(
                                                            "ml-2 truncate text-sm",
                                                            pathname === `/chat/${chat.id}` ? "text-foreground font-medium" : "text-foreground/80"
                                                        )} title={chat.title}>
                                                            {chat.title.length > 18 ? `${chat.title.slice(0, 18)}...` : chat.title}
                                                        </span>
                                                    )}
                                                </div>
                                                {state !== "collapsed" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-muted-foreground hover:text-foreground flex-shrink-0"
                                                        onClick={(e) => handleDeleteChat(chat.id, e)}
                                                        title="Delete chat"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))
                            )}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                
                <div className="relative my-0">
                    <div className="absolute inset-x-0">
                        <Separator className="w-full h-px bg-border/40" />
                    </div>
                </div>
                
                <SidebarGroup className="flex-shrink-0">
                    <SidebarGroupLabel className={cn(
                        "px-4 pt-0 text-xs font-medium text-muted-foreground/80 uppercase tracking-wider",
                        state === "collapsed" ? "sr-only" : ""
                    )}>
                        MCP Servers
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton 
                                    onClick={() => setMcpSettingsOpen(true)}
                                    className={cn(
                                        "w-full flex items-center gap-2 transition-all",
                                        "hover:bg-secondary/50 active:bg-secondary/70"
                                    )}
                                    tooltip={state === "collapsed" ? "MCP Servers" : undefined}
                                >
                                    <ServerIcon className={cn(
                                        "h-4 w-4 flex-shrink-0",
                                        activeServersCount > 0 ? "text-primary" : "text-muted-foreground"
                                    )} />
                                    {state !== "collapsed" && (
                                        <span className="flex-grow text-sm text-foreground/80">MCP Servers</span>
                                    )}
                                    {activeServersCount > 0 && state !== "collapsed" ? (
                                        <Badge 
                                            variant="secondary" 
                                            className="ml-auto text-[10px] px-1.5 py-0 h-5 bg-secondary/80"
                                        >
                                            {activeServersCount}
                                        </Badge>
                                    ) : activeServersCount > 0 && state === "collapsed" ? (
                                        <SidebarMenuBadge className="bg-secondary/80 text-secondary-foreground">
                                            {activeServersCount}
                                        </SidebarMenuBadge>
                                    ) : null}
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            
            <SidebarFooter className="p-4 border-t border-border/40 mt-auto">
                <div className={`flex flex-col ${state === "collapsed" ? "items-center" : ""} gap-3`}>
                    <Button
                        variant="default"
                        className={cn(
                            "w-full bg-primary text-primary-foreground hover:bg-primary/90",
                            state === "collapsed" ? "w-8 h-8 p-0" : ""
                        )}
                        onClick={handleNewChat}
                        title={state === "collapsed" ? "New Chat" : undefined}
                    >
                        <PlusCircle className={`${state === "collapsed" ? "" : "mr-2"} h-4 w-4`} />
                        {state !== "collapsed" && <span>New Chat</span>}
                    </Button>
                    
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            {state === "collapsed" ? (
                                <Button
                                    variant="ghost"
                                    className="w-8 h-8 p-0 flex items-center justify-center"
                                >
                                    <Avatar className="h-6 w-6 rounded-lg bg-secondary/60">
                                        <AvatarFallback className="rounded-lg text-xs font-medium text-secondary-foreground">
                                            {userId.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            ) : (
                                <Button 
                                    variant="outline" 
                                    className="w-full justify-between font-normal bg-transparent border border-border/60 shadow-none px-2 h-10 hover:bg-secondary/50"
                                >
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-7 w-7 rounded-lg bg-secondary/60">
                                            <AvatarFallback className="rounded-lg text-sm font-medium text-secondary-foreground">
                                                {userId.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid text-left text-sm leading-tight">
                                            <span className="truncate font-medium text-foreground/90">User ID</span>
                                            <span className="truncate text-xs text-muted-foreground">{userId.substring(0, 16)}...</span>
                                        </div>
                                    </div>
                                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-56 rounded-lg"
                            side={state === "collapsed" ? "top" : "top"}
                            align={state === "collapsed" ? "start" : "end"}
                            sideOffset={8}
                        >
                            <DropdownMenuLabel className="p-0 font-normal">
                                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                    <Avatar className="h-8 w-8 rounded-lg bg-secondary/60">
                                        <AvatarFallback className="rounded-lg text-sm font-medium text-secondary-foreground">
                                            {userId.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold text-foreground/90">User ID</span>
                                        <span className="truncate text-xs text-muted-foreground">{userId}</span>
                                    </div>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuItem onSelect={(e) => {
                                    e.preventDefault();
                                    navigator.clipboard.writeText(userId);
                                    toast.success("User ID copied to clipboard");
                                }}>
                                    <Copy className="mr-2 h-4 w-4 hover:text-sidebar-accent" />
                                    Copy User ID
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={(e) => {
                                    e.preventDefault();
                                    setEditUserIdOpen(true);
                                }}>
                                    <Pencil className="mr-2 h-4 w-4 hover:text-sidebar-accent" />
                                    Edit User ID
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuItem onSelect={(e) => {
                                    e.preventDefault();
                                    setMcpSettingsOpen(true);
                                }}>
                                    <Settings className="mr-2 h-4 w-4 hover:text-sidebar-accent" />
                                    MCP Settings
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={(e) => {
                                    e.preventDefault();
                                    setApiKeyDialogOpen(true);
                                }}>
                                    <KeyRound className="mr-2 h-4 w-4 hover:text-sidebar-accent" />
                                    Set API Key
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={(e) => {
                                    e.preventDefault();
                                    window.open("https://git.new/s-mcp", "_blank");
                                }}>
                                    <Github className="mr-2 h-4 w-4 hover:text-sidebar-accent" />
                                    GitHub
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center">
                                            <Sparkles className="mr-2 h-4 w-4 hover:text-sidebar-accent" />
                                            Theme
                                        </div>
                                        <ThemeToggle className="h-6 w-6" />
                                    </div>
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                
                <MCPServerManager
                    servers={mcpServers}
                    onServersChange={setMcpServers}
                    selectedServers={selectedMcpServers}
                    onSelectedServersChange={setSelectedMcpServers}
                    open={mcpSettingsOpen}
                    onOpenChange={setMcpSettingsOpen}
                />
            </SidebarFooter>

            <Dialog open={editUserIdOpen} onOpenChange={(open) => {
                setEditUserIdOpen(open);
                if (open) {
                    setNewUserId(userId);
                }
            }}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Edit User ID</DialogTitle>
                        <DialogDescription>
                            Update your user ID for chat synchronization. This will affect which chats are visible to you.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="userId">User ID</Label>
                            <Input
                                id="userId"
                                value={newUserId}
                                onChange={(e) => setNewUserId(e.target.value)}
                                placeholder="Enter your user ID"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditUserIdOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateUserId}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isApiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Set API Key</DialogTitle>
                        <DialogDescription>
                            Provide your own API key (e.g., OpenAI, Anthropic) to bypass daily limits.
                            Your key is stored in your browser&apos;s storage and will be automatically cleared when you close the page.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="apiKeyInput">API Key</Label>
                            <Input
                                id="apiKeyInput"
                                type="password"
                                value={apiKeyInputValue}
                                onChange={(e) => setApiKeyInputValue(e.target.value)}
                                placeholder="Enter your API key (e.g., sk-...)"
                            />
                            
                            <Label htmlFor="modelNameInput" className="mt-4">Custom Model Name (Optional)</Label>
                            <Input
                                id="modelNameInput"
                                type="text"
                                value={modelNameInputValue}
                                onChange={(e) => setModelNameInputValue(e.target.value)}
                                placeholder="e.g., gpt-4.5-turbo"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                If specified, this model will be used instead of the default model for the provider.
                            </p>
                            
                            <div className="space-y-2 mt-2">
                                <p className="text-xs text-muted-foreground">
                                    This key will be used when the default key reaches its limit.
                                </p>
                                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/50 rounded-md">
                                    <p className="text-xs font-medium text-amber-800 dark:text-amber-500">Security Warning:</p>
                                    <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc list-inside mt-1 space-y-1">
                                        <li>Your API key is stored in browser storage</li>
                                        <li>Always clear your key after use</li>
                                        <li>Never enter your key on shared or public devices</li>
                                        <li>The key will automatically clear when you close this page</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex justify-between">
                        <div className="flex gap-2">
                            <Button
                                variant="destructive"
                                onClick={handleClearApiKey}
                                disabled={!apiKey}
                            >
                                Clear API Key
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setApiKeyDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleSaveApiKey}>
                                Save API Key
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Sidebar>
    );
} 