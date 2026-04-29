import { Button } from '@/components/ui/button';
import { Head, router } from '@inertiajs/react';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export default function Unauthorized() {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <Head title="Access Denied" />
            
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-500/5 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />

            <div className="max-w-md w-full text-center space-y-8 relative z-10">
                {/* Icon Section */}
                <div className="relative inline-flex items-center justify-center">
                    <div className="absolute inset-0 bg-rose-500/20 blur-2xl rounded-full animate-pulse" />
                    <div className="relative bg-background border-2 border-rose-500/20 p-6 rounded-3xl shadow-2xl">
                        <ShieldAlert className="w-16 h-16 text-rose-500" strokeWidth={1.5} />
                    </div>
                </div>

                {/* Text Content */}
                <div className="space-y-3">
                    <h1 className="text-7xl font-black tracking-tighter text-foreground/10 absolute -top-12 left-1/2 -translate-x-1/2 pointer-events-none">
                        403
                    </h1>
                    <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                        Akses Ditolak
                    </h2>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                        Sepertinya kamu tidak memiliki "akses" yang tepat untuk masuk ke halaman ini. Hubungi Admin jika ini adalah kesalahan.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                    <Button 
                        variant="outline" 
                        size="lg"
                        onClick={() => window.history.back()}
                        className="w-full h-14 rounded-2xl font-bold gap-2 border-border/50 hover:bg-muted transition-all active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Kembali
                    </Button>
                    <Button 
                        size="lg"
                        onClick={() => router.get('/')}
                        className="w-full h-14 rounded-2xl font-bold gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-xl transition-all active:scale-95"
                    >
                        <Home className="w-5 h-5" />
                        Ke Dashboard
                    </Button>
                </div>

                {/* Footer Quote */}
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-bold">
                    Security Protocol • Error Code 403
                </p>
            </div>
        </div>
    );
}
