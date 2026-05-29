'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, MoreVertical, Shield, User, UserX, Ban, BarChart3 } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';

interface UserRecord {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    auth_provider: string;
    email_verified: boolean;
    is_active: boolean;
    is_banned: boolean;
    created_at: string;
    last_login_at: string | null;
    today_usage: number;
}

interface UserStats {
    daily_messages: number;
    weekly_messages: number;
    total_messages: number;
    session_count: number;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Stats modal
    const [statsUser, setStatsUser] = useState<UserRecord | null>(null);
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        try {
            const res = await authFetch('/api/admin/users');
            if (!res.ok) throw new Error('Failed to load users');
            const data = await res.json();
            setUsers(data.users);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load users');
        } finally {
            setIsLoading(false);
        }
    }

    async function changeRole(userId: string, newRole: string) {
        try {
            const res = await authFetch(`/api/admin/users/${userId}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            });
            if (!res.ok) throw new Error('Failed to update role');
            fetchUsers();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to update role');
        }
    }

    async function toggleBan(userId: string) {
        try {
            const res = await authFetch(`/api/admin/users/${userId}/ban`, {
                method: 'PATCH',
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: data.is_banned } : u));
            }
        } catch {
            /* ignore */
        }
    }

    async function viewStats(user: UserRecord) {
        setStatsUser(user);
        setIsLoadingStats(true);
        setUserStats(null);
        try {
            const res = await authFetch(`/api/admin/users/${user.id}/stats`);
            if (res.ok) {
                const data = await res.json();
                setUserStats(data.stats);
            }
        } catch {
            /* ignore */
        } finally {
            setIsLoadingStats(false);
        }
    }

    function roleBadge(role: string) {
        switch (role) {
            case 'admin':
                return <Badge className="bg-primary text-primary-foreground">Admin</Badge>;
            case 'free':
                return <Badge variant="secondary">Free</Badge>;
            case 'guest':
                return <Badge variant="outline" className="text-muted-foreground">Guest</Badge>;
            default:
                return <Badge variant="outline">{role}</Badge>;
        }
    }

    function providerBadge(provider: string) {
        if (provider === 'google') {
            return <Badge variant="outline" className="text-xs">Google</Badge>;
        }
        return <Badge variant="outline" className="text-xs">Email</Badge>;
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Users</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {users.length} registered user{users.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Users Table */}
            <Card className="overflow-hidden border-border/50">
                <CardContent className="p-0 overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Provider</TableHead>
                                <TableHead className="text-right">Today</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="w-12" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((u) => (
                                <TableRow key={u.id} className={u.is_banned ? 'opacity-60' : ''}>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium text-sm text-foreground">
                                                {u.full_name || '—'}
                                            </div>
                                            <div className="text-xs text-muted-foreground">{u.email}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{roleBadge(u.role)}</TableCell>
                                    <TableCell>
                                        {u.is_banned ? (
                                            <Badge variant="destructive" className="text-xs">Banned</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">Active</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{providerBadge(u.auth_provider)}</TableCell>
                                    <TableCell className="text-right font-mono text-sm">
                                        {u.today_usage}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {new Date(u.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon-xs">
                                                    <MoreVertical className="size-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => viewStats(u)}>
                                                    <BarChart3 className="size-4 mr-2" />
                                                    View Stats
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => changeRole(u.id, 'admin')}
                                                    disabled={u.role === 'admin'}
                                                >
                                                    <Shield className="size-4 mr-2" />
                                                    Make Admin
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => changeRole(u.id, 'free')}
                                                    disabled={u.role === 'free'}
                                                >
                                                    <User className="size-4 mr-2" />
                                                    Set Free User
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => changeRole(u.id, 'guest')}
                                                    disabled={u.role === 'guest'}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <UserX className="size-4 mr-2" />
                                                    Demote to Guest
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => toggleBan(u.id)}
                                                    className={u.is_banned ? 'text-emerald-600 focus:text-emerald-600' : 'text-destructive focus:text-destructive'}
                                                >
                                                    <Ban className="size-4 mr-2" />
                                                    {u.is_banned ? 'Unban User' : 'Ban User'}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No users yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* User Stats Modal */}
            <Dialog open={!!statsUser} onOpenChange={() => setStatsUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BarChart3 className="size-5" />
                            User Statistics
                        </DialogTitle>
                        <DialogDescription>
                            {statsUser?.full_name || statsUser?.email || 'User'} — usage analytics
                        </DialogDescription>
                    </DialogHeader>
                    {isLoadingStats ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="size-6 animate-spin text-primary" />
                        </div>
                    ) : userStats ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-lg border border-border p-4 text-center">
                                <div className="text-2xl font-bold text-foreground">{userStats.daily_messages}</div>
                                <div className="text-xs text-muted-foreground mt-1">Today</div>
                            </div>
                            <div className="rounded-lg border border-border p-4 text-center">
                                <div className="text-2xl font-bold text-foreground">{userStats.weekly_messages}</div>
                                <div className="text-xs text-muted-foreground mt-1">This Week</div>
                            </div>
                            <div className="rounded-lg border border-border p-4 text-center">
                                <div className="text-2xl font-bold text-foreground">{userStats.total_messages}</div>
                                <div className="text-xs text-muted-foreground mt-1">All Time</div>
                            </div>
                            <div className="rounded-lg border border-border p-4 text-center">
                                <div className="text-2xl font-bold text-foreground">{userStats.session_count}</div>
                                <div className="text-xs text-muted-foreground mt-1">Sessions</div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-4">No data available</div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
