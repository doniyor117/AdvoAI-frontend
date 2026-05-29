'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Scale, LayoutDashboard, Users, FileText, ArrowLeft, Loader2 } from 'lucide-react';

const NAV_ITEMS = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/documents', label: 'Documents', icon: FileText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading, isAdmin } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Redirect non-admin users
    useEffect(() => {
        if (!isLoading && (!user || !isAdmin)) {
            router.push('/');
        }
    }, [isLoading, user, isAdmin, router]);

    // Close sidebar on route change on mobile
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsSidebarOpen(false);
    }, [pathname]);

    if (isLoading) {
        return (
            <div className="min-h-svh flex items-center justify-center bg-background">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user || !isAdmin) {
        return null;
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
