'use client';

import { useEffect } from 'react';
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

    // Redirect non-admin users
    useEffect(() => {
        if (!isLoading && (!user || !isAdmin)) {
            router.push('/');
        }
    }, [isLoading, user, isAdmin, router]);

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
        <div className="min-h-svh flex bg-background">
            {/* Admin Sidebar */}
            <aside className="w-64 border-r border-border bg-card flex flex-col flex-shrink-0">
                {/* Header */}
                <div className="h-14 border-b border-border flex items-center px-4 gap-2">
                    <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg">
                        <Scale className="size-4" />
                    </div>
                    <div>
                        <span className="font-serif font-semibold text-sm">Yurika</span>
                        <span className="text-xs text-muted-foreground ml-1.5">Admin</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1">
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
                <div className="p-3 border-t border-border">
                    <Link
                        href="/"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        <ArrowLeft className="size-4" />
                        Back to chat
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}
