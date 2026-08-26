'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { authFetch, safeJson } from '@/lib/authFetch';

export default function ForgotPasswordPage() {
    const router = useRouter();

    const [step, setStep] = useState<'email' | 'reset'>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleRequestReset(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const res = await authFetch('/api/account/request-password-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await safeJson(res);
            if (res.ok) {
                setStep('reset');
            } else {
                setError(data.detail || 'Failed to request reset.');
            }
        } catch (err) {
            setError('An error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleResetPassword(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await authFetch('/api/account/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, new_password: newPassword }),
            });
            const data = await safeJson(res);
            if (res.ok) {
                setSuccessMsg('Password reset successfully! You can now log in.');
                setTimeout(() => {
                    router.push('/login');
                }, 3000);
            } else {
                setError(data.detail || 'Failed to reset password.');
            }
        } catch (err) {
            setError('An error occurred.');
        } finally {
            setIsSubmitting(false);
        }
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
                                <CardTitle className="text-2xl font-serif">Reset Password</CardTitle>
                                <CardDescription>
                                    {step === 'email' ? 'Enter your email to receive a reset code' : 'Enter the code and your new password'}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="px-0">
                                {successMsg ? (
                                    <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-600 text-center">
                                        {successMsg}
                                    </div>
                                ) : (
                                    <form onSubmit={step === 'email' ? handleRequestReset : handleResetPassword} className="space-y-4">
                                        {error && (
                                            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                                                {error}
                                            </div>
                                        )}

                                        {step === 'email' ? (
                                            <>
                                                <div className="space-y-2">
                                                    <Label htmlFor="email">Email</Label>
                                                    <Input
                                                        id="email"
                                                        type="email"
                                                        placeholder="you@example.com"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        required
                                                    />
                                                </div>

                                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                                    {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                                                    Send Reset Code
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <div className="space-y-2 text-center mb-4">
                                                    <p className="text-sm text-muted-foreground">
                                                        Code sent to <strong>{email}</strong>
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

                                                <div className="space-y-2">
                                                    <Label htmlFor="newPassword">New Password</Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="newPassword"
                                                            type={showPassword ? 'text' : 'password'}
                                                            placeholder="Min. 8 characters"
                                                            value={newPassword}
                                                            onChange={(e) => setNewPassword(e.target.value)}
                                                            required
                                                            minLength={8}
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

                                                <div className="space-y-2">
                                                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="confirmPassword"
                                                            type={showConfirmPassword ? 'text' : 'password'}
                                                            placeholder="Rewrite new password"
                                                            value={confirmPassword}
                                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                                            required
                                                            minLength={8}
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
                                                    {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                                                    Reset Password
                                                </Button>

                                                <Button 
                                                    variant="ghost" 
                                                    type="button" 
                                                    className="w-full text-xs mt-2" 
                                                    onClick={() => setStep('email')}
                                                    disabled={isSubmitting}
                                                >
                                                    Back
                                                </Button>
                                            </>
                                        )}
                                    </form>
                                )}

                                <div className="mt-6 flex justify-center">
                                    <Link href="/login" className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                                        <ArrowLeft className="mr-2 size-4" />
                                        Back to login
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Right: Cover */}
            <div 
                className="relative hidden lg:block overflow-hidden bg-cover bg-center"
                style={{ backgroundImage: "url('/login-background-img.jpg')" }}
            >
                <div className="absolute inset-0 bg-black/40" />
            </div>
        </div>
    );
}
