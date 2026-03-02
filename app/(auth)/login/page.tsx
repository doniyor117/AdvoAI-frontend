'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Scale, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const { login, loginWithGoogle, isAuthenticated } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    const handleGoogleCredential = useCallback(async (credential: string) => {
        setError('');
        setIsGoogleLoading(true);
        const result = await loginWithGoogle(credential);
        if (result.success) {
            router.push('/');
        } else {
            setError(result.error || 'Google sign-in failed.');
        }
        setIsGoogleLoading(false);
    }, [loginWithGoogle, router]);

    const { triggerGoogleLogin, isAvailable: isGoogleAvailable } = useGoogleAuth({
        onCredential: handleGoogleCredential,
    });

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            router.push('/');
        }
    }, [isAuthenticated, router]);

    if (isAuthenticated) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        const result = await login(email, password);

        if (result.success) {
            router.push('/');
        } else {
            setError(result.error || 'Login failed.');
        }

        setIsSubmitting(false);
    }

    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            {/* Left: Form */}
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2 md:justify-start">
                    <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
                        <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg">
                            <Scale className="size-4" />
                        </div>
                        <span className="font-serif text-lg">Yurika</span>
                    </Link>
                </div>

                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-sm">
                        <Card className="border-0 shadow-none bg-transparent">
                            <CardHeader className="text-center px-0">
                                <CardTitle className="text-2xl font-serif">Welcome back</CardTitle>
                                <CardDescription>Sign in to your Yurika account</CardDescription>
                            </CardHeader>

                            <CardContent className="px-0">
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {error && (
                                        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                                            {error}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            autoComplete="email"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password">Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                autoComplete="current-password"
                                                className="pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                tabIndex={-1}
                                            >
                                                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="size-4 animate-spin" />
                                                Signing in...
                                            </>
                                        ) : (
                                            'Sign in'
                                        )}
                                    </Button>

                                    <div className="relative my-4">
                                        <Separator />
                                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                                            or
                                        </span>
                                    </div>

                                    <Button
                                        variant="outline"
                                        type="button"
                                        className="w-full"
                                        disabled={!isGoogleAvailable || isGoogleLoading}
                                        onClick={triggerGoogleLogin}
                                    >
                                        {isGoogleLoading ? (
                                            <Loader2 className="size-4 animate-spin mr-2" />
                                        ) : (
                                            <svg className="size-4 mr-2" viewBox="0 0 24 24">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                            </svg>
                                        )}
                                        Continue with Google
                                    </Button>
                                </form>

                                <p className="mt-6 text-center text-sm text-muted-foreground">
                                    Don&apos;t have an account?{' '}
                                    <Link href="/signup" className="text-primary hover:underline font-medium">
                                        Create one
                                    </Link>
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Right: Cover */}
            <div className="relative hidden lg:block bg-primary">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-primary-foreground">
                    <Scale className="size-16 mb-6 opacity-80" />
                    <h2 className="text-3xl font-serif font-bold mb-3 text-center">Legal Intelligence, Simplified</h2>
                    <p className="text-center text-primary-foreground/70 max-w-md text-lg">
                        Access Uzbekistan&apos;s legal framework with AI-powered research, citations, and expert analysis.
                    </p>
                </div>
                {/* Decorative gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-primary-foreground z-10">
                    <Scale className="size-16 mb-6 opacity-90" />
                    <h2 className="text-3xl font-serif font-bold mb-3 text-center">Legal Intelligence, Simplified</h2>
                    <p className="text-center text-primary-foreground/70 max-w-md text-lg">
                        Access Uzbekistan&apos;s legal framework with AI-powered research, citations, and expert analysis.
                    </p>
                </div>
            </div>
        </div>
    );
}
