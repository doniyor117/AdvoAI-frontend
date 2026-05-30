import React from 'react';
import Link from 'next/link';
import { Scale, ArrowLeft } from 'lucide-react';

export const metadata = {
    title: 'Privacy Policy - AdvoAI',
    description: 'Privacy Policy for AdvoAI',
};

export default function PrivacyPage() {
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
                    <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4">Privacy Policy</h1>
                    <p className="text-muted-foreground mb-8">Last Updated: May 2026</p>

                    <p>
                        AdvoAI (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our platform.
                    </p>

                    <h2>1. Information We Collect</h2>
                    <p>We collect information you provide directly to us when you create an account and use the Service:</p>
                    <ul>
                        <li><strong>Account Information:</strong> Your name, email address, and authentication credentials (including Google Single Sign-On data if used).</li>
                        <li><strong>Chat Data & Interactions:</strong> The text, documents, and images you upload or send to the AI during your chat sessions.</li>
                        <li><strong>Usage Data:</strong> Technical information about how you interact with the platform to help us diagnose issues and ensure stability.</li>
                    </ul>

                    <h2>2. How We Use Your Information</h2>
                    <p>We use your data primarily to provide and maintain the Service. Specifically:</p>
                    <ul>
                        <li>To authenticate you and secure your account.</li>
                        <li>To process your queries through underlying AI models (like Google Gemini) to generate responses.</li>
                        <li>To display your chat history back to you.</li>
                    </ul>

                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4 my-6">
                        <h3 className="text-blue-800 dark:text-blue-500 font-semibold mt-0 mb-2">Session Review & Product Improvement</h3>
                        <p className="text-sm text-blue-900/80 dark:text-blue-200/80 mb-0">
                            During registration, you may optionally consent to allow our team to review anonymized versions of your chat sessions. If you opt-in, we use this data solely to improve our AI prompts, document parsing, and overall product quality. <strong>You can withdraw this consent at any time</strong> from your Account Settings via the &quot;Data &amp; Privacy&quot; toggle.
                        </p>
                    </div>

                    <h2>3. Data Retention and Deletion</h2>
                    <p>
                        We retain your personal data and chat history <strong>for as long as your account is active</strong>. 
                        If you choose to permanently delete your account, all associated data—including your sessions, messages, and uploaded files—will be permanently wiped from our active databases.
                    </p>

                    <h2>4. Third-Party Service Providers</h2>
                    <p>
                        AdvoAI utilizes third-party infrastructure to function. Your queries and uploaded documents are securely transmitted to large language model providers (such as Google Gemini) via API to generate responses. These providers are bound by strict enterprise agreements regarding data processing and do not use your inputs to train their public models.
                    </p>

                    <h2>5. Your Rights</h2>
                    <p>You have the right to:</p>
                    <ul>
                        <li>Access the personal data we hold about you.</li>
                        <li>Correct inaccuracies in your data.</li>
                        <li>Withdraw consent for optional data collection (session review) at any time.</li>
                        <li>Request the permanent deletion of your account and all associated data.</li>
                    </ul>

                    <h2>6. Security</h2>
                    <p>
                        We implement industry-standard security measures to protect your data, including encryption in transit and at rest. However, no internet transmission is 100% secure, and we cannot guarantee absolute security. Please do not submit highly sensitive or classified legal documents if absolute secrecy is required.
                    </p>

                    <h2>7. Changes to this Policy</h2>
                    <p>
                        We may update this Privacy Policy from time to time. We will notify you of any significant changes by updating the &quot;Last Updated&quot; date at the top of this page or by providing notice within the app.
                    </p>
                </div>
            </main>
        </div>
    );
}
