'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
    const { login, loginWithGoogle, isAuthenticated, user } = useAuth();

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
            if (result.requiresConsent) {
                router.push('/consent');
            } else {
                router.push('/');
            }
        } else {
            setError(result.error || 'Google sign-in failed.');
        }
        setIsGoogleLoading(false);
    }, [loginWithGoogle, router]);

    const googleButtonRef = useRef<HTMLDivElement>(null);
    const { renderGoogleButton, isAvailable: isGoogleAvailable, isLoaded } = useGoogleAuth({
        onCredential: handleGoogleCredential,
    });

    useEffect(() => {
        if (isGoogleAvailable && isLoaded && googleButtonRef.current) {
            renderGoogleButton(googleButtonRef.current);
        }
    }, [isGoogleAvailable, isLoaded, renderGoogleButton]);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && user) {
            if (!user.terms_accepted) {
                router.push('/consent');
            } else {
                router.push('/');
            }
        }
    }, [isAuthenticated, user, router]);

    if (isAuthenticated) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        const result = await login(email, password);

        if (result.success) {
            if (result.requiresConsent) {
                router.push('/consent');
            } else {
                router.push('/');
            }
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
                        <span className="font-serif text-lg">AdvoAI</span>
                    </Link>
                </div>

                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-sm">
                        <Card className="border-0 shadow-none bg-transparent">
                            <CardHeader className="text-center px-0">
                                <CardTitle className="text-2xl font-serif">Welcome back</CardTitle>
                                <CardDescription>Sign in to your AdvoAI account</CardDescription>
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
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="password">Password</Label>
                                            <Link href="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                                                Forgot Password?
                                            </Link>
                                        </div>
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

                                    <div className="w-full min-h-[44px] flex justify-center items-center">
                                        {!isGoogleAvailable || isGoogleLoading || !isLoaded ? (
                                            <Button variant="outline" type="button" className="w-full" disabled>
                                                {isGoogleLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                                                Continue with Google
                                            </Button>
                                        ) : (
                                            <div ref={googleButtonRef} className="w-full flex justify-center" />
                                        )}
                                    </div>
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
            <div 
                className="relative hidden lg:block bg-cover bg-center"
                style={{ backgroundImage: "url('/login-background-img.jpg')" }}
            >
                {/* Decorative gradient overlay */}
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-white z-10">
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
