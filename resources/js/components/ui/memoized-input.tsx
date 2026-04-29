import React, { useEffect, useState } from 'react';
import { Input } from './input';

interface MemoizedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    value: string;
    onValueChange: (value: string) => void;
    debounceTime?: number;
}

/**
 * MemoizedInput - Komponen untuk mencegah lag pada form besar.
 * Mengelola state lokal saat mengetik dan hanya mengupdate parent 
 * setelah jeda (debounce) atau saat kehilangan fokus (blur).
 */
export const MemoizedInput = React.memo(({ 
    value, 
    onValueChange, 
    debounceTime = 500,
    ...props 
}: MemoizedInputProps) => {
    const [localValue, setLocalValue] = useState(value);

    // Sinkronisasi jika data di parent berubah secara eksternal
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    // Debounce Logic: Update parent setelah user berhenti mengetik
    useEffect(() => {
        const handler = setTimeout(() => {
            if (localValue !== value) {
                onValueChange(localValue);
            }
        }, debounceTime);

        return () => clearTimeout(handler);
    }, [localValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalValue(e.target.value);
    };

    const handleBlur = () => {
        if (localValue !== value) {
            onValueChange(localValue);
        }
    };

    return (
        <Input
            {...props}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
        />
    );
});

MemoizedInput.displayName = 'MemoizedInput';
