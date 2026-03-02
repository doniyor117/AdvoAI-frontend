export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-svh w-full bg-background">
            {children}
        </div>
    );
}
