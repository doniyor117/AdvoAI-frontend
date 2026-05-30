'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Scale, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ConsentPage() {
    const router = useRouter();
    const { user, isAuthenticated, submitConsent, logout } = useAuth();

    const [termsAccepted, setTermsAccepted] = useState(false);
    const [allowDataCollection, setAllowDataCollection] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // If not authenticated, go to login. If already accepted, go to home.
    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
        } else if (user?.terms_accepted) {
            router.push('/');
        }
    }, [isAuthenticated, user, router]);

    if (!isAuthenticated || user?.terms_accepted) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        if (!termsAccepted) {
            setError('You must accept the Terms of Service and Privacy Policy to continue.');
            return;
        }

        setIsSubmitting(true);
        const result = await submitConsent(allowDataCollection);

        if (result.success) {
            router.push('/');
        } else {
            setError(result.error || 'Failed to record consent.');
            setIsSubmitting(false);
        }
    }

    return (
        <div className="min-h-svh flex flex-col items-center justify-center p-6 bg-muted/30">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
                        <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg shadow-sm">
                            <Scale className="size-5" />
                        </div>
                        <span className="font-serif text-xl">AdvoAI</span>
                    </Link>
                </div>

                <Card className="border shadow-sm bg-background">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-serif">Almost there!</CardTitle>
                        <CardDescription>
                            Please review and accept our policies to complete your account setup.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <div className="flex items-center h-5">
                                        <input
                                            type="checkbox"
                                            checked={termsAccepted}
                                            onChange={(e) => setTermsAccepted(e.target.checked)}
                                            className="w-4 h-4 border border-slate-300 rounded bg-slate-50 focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:border-slate-600 appearance-none checked:bg-primary checked:border-primary relative
                                                after:content-[''] after:absolute after:hidden checked:after:block after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-1.5 after:h-2.5 after:border-r-2 after:border-b-2 after:border-white after:rotate-45"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                            I agree to the <Link href="/terms" target="_blank" className="text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-800 dark:hover:text-blue-300">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-800 dark:hover:text-blue-300">Privacy Policy</Link> <span className="text-destructive">*</span>
                                        </span>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer group bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                    <div className="flex items-center h-5 mt-0.5">
                                        <input
                                            type="checkbox"
                                            checked={allowDataCollection}
                                            onChange={(e) => setAllowDataCollection(e.target.checked)}
                                            className="w-4 h-4 border border-blue-200 rounded bg-white focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:border-blue-800 appearance-none checked:bg-blue-600 checked:border-blue-600 relative
                                                after:content-[''] after:absolute after:hidden checked:after:block after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-1.5 after:h-2.5 after:border-r-2 after:border-b-2 after:border-white after:rotate-45"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                            Allow session review for product improvement
                                        </span>
                                        <span className="text-xs text-blue-700/80 dark:text-blue-300/80 mt-1 leading-snug">
                                            Optional: Help us make AdvoAI better by allowing our team to review anonymized versions of your chats. You can turn this off later in Settings.
                                        </span>
                                    </div>
                                </label>
                            </div>

                            <div className="flex flex-col gap-3">
                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="size-4 animate-spin mr-2" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Continue to AdvoAI'
                                    )}
                                </Button>
                                <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={logout} disabled={isSubmitting}>
                                    Sign out
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
