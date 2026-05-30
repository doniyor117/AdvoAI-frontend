'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, MoreVertical, Shield, User, UserX, Ban, BarChart3, Filter, Crown, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authFetch } from '@/lib/authFetch';
import { useAuth } from '@/contexts/AuthContext';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

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

    // Modal state for upgrading to Admin
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const [upgradeUserId, setUpgradeUserId] = useState<string | null>(null);
    const [upgradePassword, setUpgradePassword] = useState('');
    const [isUpgrading, setIsUpgrading] = useState(false);

    const [statsUser, setStatsUser] = useState<UserRecord | null>(null);
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [userChartData, setUserChartData] = useState<any[]>([]);
    const [timeRange, setTimeRange] = useState('30d');
    const [isLoadingStats, setIsLoadingStats] = useState(false);

    // Delete user confirmation
    const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
    const [isDeletingUser, setIsDeletingUser] = useState(false);

    // Is the current logged-in admin a root_admin?
    const { user: currentUser } = useAuth();
    const isCurrentRootAdmin = currentUser?.role === 'root_admin';

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

    async function changeRole(userId: string, newRole: string, password?: string) {
        if (newRole === 'admin' && password === undefined) {
            setUpgradeUserId(userId);
            setUpgradePassword('');
            setUpgradeModalOpen(true);
            return;
        }

        try {
            setIsUpgrading(true);
            const res = await authFetch(`/api/admin/users/${userId}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole, admin_password: password || undefined }),
            });
            if (!res.ok) throw new Error('Failed to update role');
            fetchUsers();
            setUpgradeModalOpen(false);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to update role');
        } finally {
            setIsUpgrading(false);
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

    async function handleDeleteUser(userId: string) {
        setIsDeletingUser(true);
        try {
            const res = await authFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
            if (res.ok) {
                setUsers(prev => prev.filter(u => u.id !== userId));
                setDeleteUserId(null);
            } else {
                const data = await res.json();
                alert(data.detail || 'Failed to delete user');
            }
        } catch {
            alert('Network error. Failed to delete user.');
        } finally {
            setIsDeletingUser(false);
        }
    }

    // Fetch chart data when timeRange or statsUser changes
    useEffect(() => {
        if (statsUser) {
            fetchUserCharts(statsUser.id, timeRange);
        }
    }, [timeRange, statsUser]);

    async function fetchUserCharts(userId: string, range: string) {
        try {
            const res = await authFetch(`/api/admin/users/${userId}/charts?range=${range}`);
            if (res.ok) {
                const data = await res.json();
                setUserChartData(data.time_series);
            }
        } catch {
            // ignore
        }
    }

    async function viewStats(user: UserRecord) {
        setStatsUser(user);
        setIsLoadingStats(true);
        setUserStats(null);
        setUserChartData([]);
        try {
            const res = await authFetch(`/api/admin/users/${user.id}/stats`);
            if (res.ok) {
                const data = await res.json();
                setUserStats(data.stats);
            }
            await fetchUserCharts(user.id, timeRange);
        } catch {
            /* ignore */
        } finally {
            setIsLoadingStats(false);
        }
    }

    function roleBadge(role: string) {
        switch (role) {
            case 'root_admin':
                return (
                    <Badge className="bg-amber-500 text-white gap-1">
                        <Crown className="size-3" />
                        Root Admin
                    </Badge>
                );
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
            {/* Delete User Confirmation Dialog */}
            <Dialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive">Delete User</DialogTitle>
                        <DialogDescription>
                            This will <strong>permanently delete</strong> this user account and all their sessions, messages, and data.
                            They will need to register again. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteUserId(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            disabled={isDeletingUser}
                            onClick={() => deleteUserId && handleDeleteUser(deleteUserId)}
                        >
                            {isDeletingUser ? <Loader2 className="size-4 animate-spin mr-2" /> : <Trash2 className="size-4 mr-2" />}
                            Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upgrade to Admin</DialogTitle>
                        <DialogDescription>
                            Set an Admin Password for this user. This adds a secondary lock screen for admin access.
                            You can leave it blank if no password is required.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Input
                            type="password"
                            placeholder="Enter new admin password (optional)"
                            value={upgradePassword}
                            onChange={e => setUpgradePassword(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUpgradeModalOpen(false)}>Cancel</Button>
                        <Button 
                            disabled={isUpgrading}
                            onClick={() => upgradeUserId && changeRole(upgradeUserId, 'admin', upgradePassword)}
                        >
                            {isUpgrading && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Confirm Upgrade
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                                                {u.role !== 'root_admin' && (
                                                    <>
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
                                                        {isCurrentRootAdmin && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    onClick={() => setDeleteUserId(u.id)}
                                                                    className="text-destructive focus:text-destructive"
                                                                >
                                                                    <Trash2 className="size-4 mr-2" />
                                                                    Delete User
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </>
                                                )}
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
                <DialogContent className="max-w-2xl">
                    <DialogHeader className="flex flex-row items-start justify-between pe-6">
                        <div>
                            <DialogTitle className="flex items-center gap-2">
                                <BarChart3 className="size-5" />
                                User Statistics
                            </DialogTitle>
                            <DialogDescription>
                                {statsUser?.full_name || statsUser?.email || 'User'} — usage analytics
                            </DialogDescription>
                        </div>
                        {userStats && !isLoadingStats && (
                            <div className="w-32">
                                <Select value={timeRange} onValueChange={setTimeRange}>
                                    <SelectTrigger className="h-8 text-xs w-full">
                                        <Filter className="w-3 h-3 mr-2" />
                                        <SelectValue placeholder="Range" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1h">1H</SelectItem>
                                        <SelectItem value="24h">24H</SelectItem>
                                        <SelectItem value="7d">7D</SelectItem>
                                        <SelectItem value="30d">30D</SelectItem>
                                        <SelectItem value="all">All</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </DialogHeader>
                    
                    {isLoadingStats && !userStats ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="size-6 animate-spin text-primary" />
                        </div>
                    ) : userStats ? (
                        <div className="space-y-6">
                            {/* Key Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                            
                            {/* Activity Chart */}
                            <div className="rounded-lg border border-border p-4 h-64">
                                <h3 className="text-sm font-medium mb-4 text-muted-foreground">Message Volume ({timeRange})</h3>
                                {userChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={userChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                                            <XAxis dataKey="period" tickFormatter={(v) => new Date(v).toLocaleDateString()} className="text-xs" />
                                            <YAxis allowDecimals={false} className="text-xs" />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
                                                labelFormatter={(v) => new Date(v).toLocaleString()}
                                            />
                                            <Bar dataKey="message_count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No activity in this period</div>
                                )}
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
