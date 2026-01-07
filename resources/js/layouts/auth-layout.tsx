import AuthLayoutTemplate from '@/layouts/auth/auth-simple-layout';

export default function AuthLayout({
    children,
    company_name,
    company_logo,
    app_name,
    title,
    description,
    ...props
}: {
    children: React.ReactNode;
    company_name: string;
    company_logo: string;
    app_name: string;
    title: string;
    description: string;
}) {
    return (
        <>
            <div className="space-y-6">
                <div className="text-center">
                    <AuthLayoutTemplate
                        company_name={company_name}
                        company_logo={company_logo}
                        app_name={app_name}
                        title={title}
                        description={description}
                        {...props}
                    >
                        {children}
                    </AuthLayoutTemplate>
                </div>
            </div>
        </>
    );
}
