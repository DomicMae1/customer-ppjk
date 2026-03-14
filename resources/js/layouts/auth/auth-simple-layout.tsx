import AppLogoIcon from '@/components/app-logo-icon';
import { Link } from '@inertiajs/react';

interface AuthLayoutProps {
    children: React.ReactNode;
    name?: string;
    company_name: string;
    company_logo?: string | null;
    app_name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, company_name, company_logo, app_name, title, description }: AuthLayoutProps) {
    return (
        <div className="bg-background flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            {/* Ubah pembungkus luar agar lebih lebar (max-w-2xl) supaya teks tidak tercekik */}
            <div className="flex w-full max-w-2xl flex-col items-center gap-8">
                <div className="flex w-full flex-col items-center gap-4">
                    <Link href={route('home')} className="flex flex-col items-center gap-2 font-medium">
                        {company_logo ? (
                            <div className="mb-1 flex h-32 w-32 items-center justify-center rounded-2xl border bg-white p-2 shadow-sm md:h-40 md:w-40">
                                <img src={company_logo} alt={company_name || 'Company Logo'} className="h-full w-full object-contain" />
                            </div>
                        ) : (
                            <div className="mb-1 flex h-32 w-32 items-center justify-center rounded-2xl md:h-40 md:w-40">
                                <AppLogoIcon className="h-full w-full object-contain" />
                            </div>
                        )}
                    </Link>

                    {/* Bagian Teks: Gunakan w-full agar bisa melebar melampaui ukuran form */}
                    <div className="w-full space-y-1 px-2 text-center">
                        {/* Penyesuaian Mobile:
                            - text-2xl di mobile agar tidak memakan layar, text-4xl di desktop.
                            - mb-2 di mobile agar jarak ke App Name tidak terlalu jauh.
                            - break-words untuk mengantisipasi nama PT yang sangat panjang tanpa spasi.
                        */}
                        <h1 className="mb-2 text-2xl leading-tight font-bold tracking-tight text-balance break-words md:mb-4 md:text-4xl">
                            {company_name}
                        </h1>

                        {/* Ukuran App Name dibuat lebih proporsional */}
                        <h2 className="text-lg font-medium text-gray-700 md:text-2xl">{app_name}</h2>

                        {/* Title & Description lebih soft di mobile */}
                        <h3 className="text-muted-foreground text-base md:text-lg">{title}</h3>

                        {description && <p className="text-muted-foreground mx-auto max-w-[280px] text-xs md:max-w-sm md:text-sm">{description}</p>}
                    </div>
                </div>

                {/* Bagian Children (Form Login): Tetap jaga agar form tetap ramping (max-w-sm) */}
                <div className="animate-in fade-in slide-in-from-bottom-4 w-full max-w-sm duration-500">{children}</div>
            </div>
        </div>
    );
}
