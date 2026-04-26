/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface EmailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    idCustomer: number | string | undefined;
}

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function EmailModal({ open, onOpenChange, idCustomer }: EmailModalProps) {
    const [emailsTo, setEmailsTo] = useState<string[]>([]);
    const [inputTo, setInputTo] = useState('');
    const [emailsCc, setEmailsCc] = useState<string[]>([]);
    const [inputCc, setInputCc] = useState('');
    const [loadingEmail, setLoadingEmail] = useState(false);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    // Fetch emails when modal opens
    useEffect(() => {
        if (!open || !idCustomer) return;

        // Reset fields on open
        setSubject('');
        setBody('');
        setInputTo('');
        setInputCc('');
        setEmailsTo([]);
        setEmailsCc([]);

        const fetchEmails = async () => {
            try {
                setLoadingEmail(true);
                const res = await axios.get(`/customer/${idCustomer}/emails`);
                setEmailsTo(res.data.email_to || []);
                setEmailsCc(res.data.email_cc || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingEmail(false);
            }
        };

        fetchEmails();
    }, [open, idCustomer]);

    const addEmail = useCallback((value: string, emails: string[], setEmails: React.Dispatch<React.SetStateAction<string[]>>) => {
        const email = value.trim().toLowerCase();
        if (!email || !isValidEmail(email) || emails.includes(email)) return;
        setEmails((prev) => [...prev, email]);
    }, []);

    const removeEmail = useCallback((_index: number, _emails: string[], setEmails: React.Dispatch<React.SetStateAction<string[]>>) => {
        setEmails((prev) => prev.filter((_, i) => i !== _index));
    }, []);

    const handleSendEmail = async () => {
        try {
            if (!emailsTo.length) return toast.error('Email To wajib');
            if (!subject) return toast.error('Subject wajib');
            if (!body) return toast.error('Body wajib');

            await axios.post('/send-email', {
                id_customer: idCustomer,
                email_to: emailsTo,
                email_cc: emailsCc,
                subject,
                body,
            });

            toast.success('Email berhasil dikirim');
            onOpenChange(false);
        } catch (err) {
            console.error(err);
            toast.error('Gagal kirim email');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='max-w-3xl'>
                <DialogHeader>
                    <DialogTitle>Kirim Email</DialogTitle>
                </DialogHeader>
                {loadingEmail ? (
                    <p className="text-sm text-gray-400">Loading emails...</p>
                ) : (
                    <>
                        <div className="space-y-4">
                            {/* TO */}
                            <div>
                                <Label className="text-sm">To</Label>
                                <div className="border p-2 rounded flex flex-wrap gap-2">
                                    {emailsTo.map((email, index) => (
                                        <div key={index} className="dark:text-black bg-gray-200 px-2 py-1 rounded flex items-center gap-1 text-sm">
                                            <span>{email}</span>
                                            <button type="button" onClick={() => removeEmail(index, emailsTo, setEmailsTo)}>x</button>
                                        </div>
                                    ))}

                                    <input
                                        value={inputTo}
                                        onChange={(e) => setInputTo(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                                                e.preventDefault();
                                                addEmail(inputTo, emailsTo, setEmailsTo);
                                                setInputTo('');
                                            }
                                        }}
                                        className="outline-none flex-1 text-sm"
                                        placeholder="Add recipients"
                                    />
                                </div>
                            </div>

                            {/* CC */}
                            <div>
                                <Label className="text-sm">Cc</Label>
                                <div className="border p-2 rounded flex flex-wrap gap-2">
                                    {emailsCc.map((email, index) => (
                                        <div key={index} className="dark:text-black bg-gray-200 px-2 py-1 rounded flex items-center gap-1 text-sm">
                                            <span>{email}</span>
                                            <button type="button" onClick={() => removeEmail(index, emailsCc, setEmailsCc)}>x</button>
                                        </div>
                                    ))}

                                    <input
                                        value={inputCc}
                                        onChange={(e) => setInputCc(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                                                e.preventDefault();
                                                addEmail(inputCc, emailsCc, setEmailsCc);
                                                setInputCc('');
                                            }
                                        }}
                                        className="outline-none flex-1 text-sm"
                                        placeholder="Add Cc"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Input
                                    placeholder="Subject"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <textarea
                                    placeholder="Write your message..."
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    className="w-full border rounded p-2 min-h-[150px]"
                                />
                            </div>
                            <Button onClick={handleSendEmail}>
                                Kirim
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
