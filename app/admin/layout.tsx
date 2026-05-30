'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Scale, LayoutDashboard, Users, FileText, ArrowLeft, Loader2, Lock, ShieldAlert, Activity, Settings } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

const NAV_ITEMS = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/analytics', label: 'Analytics', icon: Activity },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/documents', label: 'Documents', icon: FileText },
    { href: '/admin/sessions', label: 'Sessions', icon: FileText },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading, isAdmin } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // Lock Screen State
    const [isCheckingLock, setIsCheckingLock] = useState(true);
    const [isLocked, setIsLocked] = useState(true);
    const [password, setPassword] = useState('');
    const [unlockError, setUnlockError] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);

    // Check lock only if admin
    useEffect(() => {
        if (!isLoading && user && isAdmin) {
            checkLockStatus();
        } else if (!isLoading) {
            setIsCheckingLock(false);
        }
    }, [isLoading, user, isAdmin]);

    async function checkLockStatus() {
        // Always require password on every page load — no caching
        setIsLocked(true);
        setIsCheckingLock(false);
    }

    async function handleUnlock(e: React.FormEvent) {
        e.preventDefault();
        setIsUnlocking(true);
        setUnlockError('');

        try {
            const res = await authFetch('/api/admin/verify-admin-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ admin_password: password }),
            });
            
            if (res.ok) {
                setIsLocked(false);
                setUnlockError('');
            } else {
                const data = await res.json();
                setUnlockError(data.detail || 'Incorrect password');
            }
        } catch {
            setUnlockError('Network error');
        } finally {
            setIsUnlocking(false);
        }
    }

    // Close sidebar on route change on mobile
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    if (isLoading || isCheckingLock) {
        return (
            <div className="min-h-svh flex flex-col items-center justify-center bg-background gap-4">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground animate-pulse">Verifying access...</p>
            </div>
        );
    }

    if (!user || !isAdmin) {
        return (
            <div className="min-h-svh flex items-center justify-center bg-slate-50 dark:bg-background p-4">
                <Card className="w-full max-w-md shadow-2xl border-destructive/20">
                    <CardHeader className="text-center space-y-2 pb-6">
                        <div className="mx-auto bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mb-2">
                            <ShieldAlert className="size-8 text-destructive" />
                        </div>
                        <CardTitle className="text-2xl font-serif">Access Denied</CardTitle>
                        <CardDescription>
                            You do not have administrator privileges to view this page. 
                            {user ? ` (Logged in as ${user.email} with role: ${user.role})` : ' (Not logged in)'}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button variant="default" onClick={() => router.push('/')} className="w-full">
                            Return to App
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (isLocked) {
        return (
            <div className="min-h-svh flex items-center justify-center bg-slate-50 dark:bg-background p-4">
                <Card className="w-full max-w-md shadow-2xl border-primary/20">
                    <CardHeader className="text-center space-y-2 pb-6">
                        <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-2">
                            <Lock className="size-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-serif">Admin Locked</CardTitle>
                        <CardDescription>
                            Please enter your Admin Password to continue. If you haven&apos;t set one, just submit empty.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleUnlock}>
                        <CardContent className="space-y-4">
                            {unlockError && (
                                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                                    <ShieldAlert className="size-4" />
                                    {unlockError}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Input
                                    type="password"
                                    placeholder="Enter Admin Password..."
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoFocus
                                    className="h-12 text-center text-lg tracking-widest"
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button type="submit" className="w-full h-12 text-md" disabled={isUnlocking}>
                                {isUnlocking ? <Loader2 className="size-5 animate-spin mr-2" /> : null}
                                Unlock Admin Panel
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => router.push('/')} className="w-full">
                                Return to App
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-svh flex flex-col md:flex-row bg-background w-full overflow-hidden">
            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-card flex-shrink-0 z-20">
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 -ml-1.5 text-muted-foreground hover:bg-accent rounded-md">
                        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                    <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg">
                        <Scale className="size-4" />
                    </div>
                    <span className="font-serif font-semibold text-sm">AdvoAI Admin</span>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/?new=true" className="p-1.5 text-muted-foreground hover:text-foreground">
                        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </Link>
                </div>
            </header>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden" 
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Admin Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Header */}
                <div className="h-14 border-b border-border flex items-center justify-between px-4 gap-2 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg">
                            <Scale className="size-4" />
                        </div>
                        <div>
                            <span className="font-serif font-semibold text-sm">AdvoAI</span>
                            <span className="text-xs text-muted-foreground ml-1.5">Admin</span>
                        </div>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1.5 text-muted-foreground hover:bg-accent rounded-md">
                        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                    }`}
                            >
                                <item.icon className="size-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-border flex flex-col gap-2">
                    <Link
                        href="/?new=true"
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        New Chat
                    </Link>
                    <Link
                        href="/"
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        <ArrowLeft className="size-4" />
                        Back to Chat
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative">
                {children}
            </main>
        </div>
    );
}
