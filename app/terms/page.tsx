import React from 'react';
import Link from 'next/link';
import { Scale, ArrowLeft } from 'lucide-react';

export const metadata = {
    title: 'Terms of Service - AdvoAI',
    description: 'Terms of Service for AdvoAI',
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center px-4 md:px-8">
                    <Link href="/" className="flex items-center gap-2 font-semibold text-foreground mr-6">
                        <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg">
                            <Scale className="size-4" />
                        </div>
                        <span className="font-serif text-lg">AdvoAI</span>
                    </Link>
                    <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                        <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                            <ArrowLeft className="size-4" />
                            Back to Login
                        </Link>
                    </div>
                </div>
            </header>

            <main className="container max-w-3xl py-10 px-6 md:py-16 md:px-8">
                <div className="prose prose-slate dark:prose-invert max-w-none">
                    <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4">Terms of Service</h1>
                    <p className="text-muted-foreground mb-8">Last Updated: May 2026</p>

                    <p>
                        Welcome to AdvoAI. By accessing or using our service, you agree to be bound by these Terms of Service. 
                        Please read them carefully before using the platform.
                    </p>

                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4 my-8">
                        <h3 className="text-amber-800 dark:text-amber-500 font-semibold mt-0 mb-2">Important Disclaimer: Not Legal Advice</h3>
                        <p className="text-sm text-amber-900/80 dark:text-amber-200/80 mb-0">
                            AdvoAI is an artificial intelligence tool designed to provide general information and assist with understanding legal concepts. <strong>AdvoAI is NOT a lawyer, and the information provided by the service does not constitute official legal advice.</strong> You should not rely on AdvoAI for critical legal decisions without consulting a qualified legal professional. No attorney-client relationship is formed by using this service.
                        </p>
                    </div>

                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        AdvoAI ("the Service") is provided "as is" by its development team. By creating an account and using the Service, you confirm that you have read, understood, and agreed to these Terms. If you do not agree, you must not use the Service.
                    </p>

                    <h2>2. User Responsibilities & Acceptable Use</h2>
                    <p>When using AdvoAI, you agree to the following rules of conduct:</p>
                    <ul>
                        <li><strong>Lawful Use:</strong> You will only use the Service for lawful purposes. You will not use it to facilitate illegal activities, fraud, or harassment.</li>
                        <li><strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your account credentials.</li>
                        <li><strong>No Malicious Activity:</strong> You may not attempt to hack, reverse-engineer, or maliciously exploit the Service or its underlying AI models.</li>
                    </ul>
                    <p>We reserve the right to suspend or terminate your account at any time if you violate these terms.</p>

                    <h2>3. Data and Privacy</h2>
                    <p>
                        Your privacy is important to us. Our data collection and usage practices are outlined in our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. 
                        By using the Service, you acknowledge our data practices.
                    </p>

                    <h2>4. Limitation of Liability</h2>
                    <p>
                        To the maximum extent permitted by law, the AdvoAI development team shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from:
                    </p>
                    <ul>
                        <li>Your use of or inability to use the Service.</li>
                        <li>Any inaccurate or hallucinated information generated by the AI models.</li>
                        <li>Any unauthorized access to or alteration of your transmissions or data.</li>
                    </ul>

                    <h2>5. Modifications to the Service</h2>
                    <p>
                        We reserve the right to modify, suspend, or discontinue the Service (or any part of it) at any time, with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance.
                    </p>

                    <h2>6. Governing Law</h2>
                    <p>
                        These Terms shall be governed by and construed in accordance with the laws of the Republic of Uzbekistan, without regard to its conflict of law provisions.
                    </p>

                    <h2>7. Contact Us</h2>
                    <p>
                        If you have any questions about these Terms, you can contact the development team through the platform or our designated support channels.
                    </p>
                </div>
            </main>
        </div>
    );
}
