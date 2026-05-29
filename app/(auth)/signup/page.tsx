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

export default function SignupPage() {
    const router = useRouter();
    const { signup, sendRegistrationOtp, loginWithGoogle, isAuthenticated } = useAuth();

    const [step, setStep] = useState<'info' | 'otp'>('info');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    const googleButtonRef = useRef<HTMLDivElement>(null);
    const { renderGoogleButton, isAvailable: isGoogleAvailable } = useGoogleAuth({
        onCredential: handleGoogleCredential,
    });

    useEffect(() => {
        if (isGoogleAvailable && googleButtonRef.current) {
            setTimeout(() => {
                if (googleButtonRef.current) renderGoogleButton(googleButtonRef.current);
            }, 100);
        }
    }, [isGoogleAvailable, renderGoogleButton]);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            router.push('/');
        }
    }, [isAuthenticated, router]);

    if (isAuthenticated) return null;

    async function handleInfoSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsSubmitting(true);
        const result = await sendRegistrationOtp(email);
        
        if (result.success) {
            setStep('otp');
        } else {
            setError(result.error || 'Failed to send verification code.');
        }
        setIsSubmitting(false);
    }

    async function handleOtpSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        if (otp.length !== 6) {
            setError('Verification code must be exactly 6 digits.');
            return;
        }

        setIsSubmitting(true);
        const result = await signup(email, password, fullName, otp);

        if (result.success) {
            router.push('/');
        } else {
            setError(result.error || 'Registration failed.');
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
                                <CardTitle className="text-2xl font-serif">Create an account</CardTitle>
                                <CardDescription>Enter your information to get started</CardDescription>
                            </CardHeader>

                            <CardContent className="px-0">
                                <form onSubmit={step === 'info' ? handleInfoSubmit : handleOtpSubmit} className="space-y-4">
                                    {error && (
                                        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                                            {error}
                                        </div>
                                    )}

                                    {step === 'info' ? (
                                        <>
                                            <div className="space-y-2">
                                                <Label htmlFor="fullName">Full name</Label>
                                                <Input
                                                    id="fullName"
                                                    type="text"
                                                    placeholder="John Doe"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    required
                                                    autoComplete="name"
                                                />
                                            </div>

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
                                                        placeholder="Min. 8 characters"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        required
                                                        minLength={8}
                                                        autoComplete="new-password"
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
                                                <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="confirmPassword"
                                                        type={showConfirmPassword ? 'text' : 'password'}
                                                        placeholder="Rewrite password"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        required
                                                        minLength={8}
                                                        autoComplete="new-password"
                                                        className="pr-10"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                        tabIndex={-1}
                                                    >
                                                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="size-4 animate-spin mr-2" />
                                                        Sending code...
                                                    </>
                                                ) : (
                                                    'Continue'
                                                )}
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="space-y-2 text-center mb-4">
                                                <p className="text-sm text-muted-foreground">
                                                    We sent a 6-digit code to <strong>{email}</strong>
                                                </p>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <Label htmlFor="otp">Verification Code</Label>
                                                <Input
                                                    id="otp"
                                                    type="text"
                                                    placeholder="123456"
                                                    value={otp}
                                                    onChange={(e) => setOtp(e.target.value)}
                                                    required
                                                    maxLength={6}
                                                    className="text-center tracking-widest text-lg"
                                                />
                                            </div>

                                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="size-4 animate-spin mr-2" />
                                                        Verifying...
                                                    </>
                                                ) : (
                                                    'Create account'
                                                )}
                                            </Button>
                                            
                                            <Button 
                                                variant="ghost" 
                                                type="button" 
                                                className="w-full text-xs mt-2" 
                                                onClick={() => setStep('info')}
                                                disabled={isSubmitting}
                                            >
                                                Back to details
                                            </Button>
                                        </>
                                    )}

                                    <div className="relative my-4">
                                        <Separator />
                                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                                            or
                                        </span>
                                    </div>

                                    <div className="w-full min-h-[44px] flex justify-center items-center">
                                        {!isGoogleAvailable || isGoogleLoading ? (
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
                                    Already have an account?{' '}
                                    <Link href="/login" className="text-primary hover:underline font-medium">
                                        Sign in
                                    </Link>
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Right: Cover */}
            <div 
                className="relative hidden lg:block overflow-hidden bg-cover bg-center"
                style={{ backgroundImage: "url('/login-background-img.png')" }}
            >
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-white z-10">
                    <Scale className="size-16 mb-6 opacity-90" />
                    <h2 className="text-3xl font-serif font-bold mb-3 text-center">Your Legal Research Partner</h2>
                    <p className="text-center text-primary-foreground/70 max-w-md text-lg">
                        Join thousands of legal professionals using AI to navigate Uzbekistan&apos;s legal landscape.
                    </p>
                    <div className="mt-8 grid grid-cols-3 gap-6 text-center">
                        <div>
                            <div className="text-2xl font-bold">500+</div>
                            <div className="text-sm text-primary-foreground/60">Legal Documents</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">24/7</div>
                            <div className="text-sm text-primary-foreground/60">Availability</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">3</div>
                            <div className="text-sm text-primary-foreground/60">Languages</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
