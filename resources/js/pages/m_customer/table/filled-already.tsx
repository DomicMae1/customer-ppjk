export default function FilledAlready() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="space-y-4 text-center">
                <h1 className="text-3xl font-bold text-red-600">Form sudah diisi</h1>
                <p className="text-white">Terima kasih! Data customer sudah dikirim dan tidak bisa diubah lagi.</p>
            </div>
        </div>
    );
}
