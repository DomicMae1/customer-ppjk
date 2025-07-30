import AuthLayoutTemplate from '@/layouts/auth/auth-simple-layout';

export default function AuthLayout({ children, title, description, ...props }: { children: React.ReactNode; title: string; description: string }) {
    return (
        <>
            <div className="space-y-6">
                <div className="text-center">
                    <AuthLayoutTemplate title={title} description={description} {...props}>
                        {children}
                    </AuthLayoutTemplate>
                </div>
            </div>
        </>
    );
}
