/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { toast } from 'sonner';

interface EmailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    idCustomer: number | string | undefined;
    idSpk?: number | string | undefined;
    sections?: any[];
}

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const quillModules = {
    toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'blockquote'],
        ['clean'],
    ],
};

export default function EmailModal({ open, onOpenChange, idCustomer, idSpk, sections = [] }: EmailModalProps) {
    const [emailsTo, setEmailsTo] = useState<string[]>([]);
    const [dbEmailsTo, setDbEmailsTo] = useState<Set<string>>(new Set());
    const [inputTo, setInputTo] = useState('');
    const [emailsCc, setEmailsCc] = useState<string[]>([]);
    const [dbEmailsCc, setDbEmailsCc] = useState<Set<string>>(new Set());
    const [inputCc, setInputCc] = useState('');
    const [loadingEmail, setLoadingEmail] = useState(false);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [attachments, setAttachments] = useState<any[]>([]);
    const [attachPdfOverview, setAttachPdfOverview] = useState(false);
    const [attachPdfKarantina, setAttachPdfKarantina] = useState(false);
    const [attachPdfNonKarantina, setAttachPdfNonKarantina] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [openPickDoc, setOpenPickDoc] = useState(false);
    const [pickDocIds, setPickDocIds] = useState<number[]>([]);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const editorRef = useRef<HTMLDivElement | null>(null);
    const quillRef = useRef<any>(null);
    const [editorReady, setEditorReady] = useState(false);
    const availableDocuments = useMemo(() => {
        const map = new Map<number, any>();
        (sections || []).forEach((section: any) => {
            (section.documents || []).forEach((doc: any) => {
                const current = map.get(doc.id_dokumen);
                if (!current || doc.id > current.id) map.set(doc.id_dokumen, doc);
            });
        });
        return Array.from(map.values());
    }, [sections]);
    const defaultAttachments = useMemo(() => {
        return availableDocuments.filter((doc: any) => doc?.master_document?.is_send_email && doc?.url_path_file).map((doc: any) => ({
            key: `doc-${doc.id_dokumen}`,
            type: 'document',
            id_dokumen: doc.id_dokumen,
            name: doc.nama_file,
            label: doc.master_document?.nama_dokumen || doc.nama_file,
            path: doc.url_path_file,
            required: true,
        }));
    }, [availableDocuments]);
    const missingRequiredAttachments = useMemo(() => {
        return availableDocuments.filter((doc: any) => doc?.master_document?.is_send_email && !doc?.url_path_file);
    }, [availableDocuments]);
    const uploadedDocuments = useMemo(() => {
        return availableDocuments.filter((doc: any) => !!doc?.url_path_file);
    }, [availableDocuments]);
    const attachedDocIds = useMemo(() => {
        const set = new Set<number>();
        (attachments || []).forEach((item: any) => {
            if (item?.type !== 'document') return;
            const key = String(item?.key || '');
            if (key.startsWith('doc-')) {
                const id = Number(key.slice(4));
                if (!Number.isNaN(id)) set.add(id);
            }
            if (item?.id_dokumen) {
                const id = Number(item.id_dokumen);
                if (!Number.isNaN(id)) set.add(id);
            }
        });
        return set;
    }, [attachments]);
    const pickableDocuments = useMemo(() => {
        return uploadedDocuments.filter((doc: any) => !doc?.master_document?.is_send_email && !attachedDocIds.has(doc.id_dokumen));
    }, [uploadedDocuments, attachedDocIds]);

    // Fetch emails when modal opens
    useEffect(() => {
        if (!open || !idCustomer) return;

        // Reset fields on open
        setSubject('');
        setBody('');
        setInputTo('');
        setInputCc('');
        setEmailsTo([]);
        setDbEmailsTo(new Set());
        setEmailsCc([]);
        setDbEmailsCc(new Set());
        setAttachments(defaultAttachments);
        setAttachPdfOverview(false);
        setAttachPdfKarantina(false);
        setAttachPdfNonKarantina(false);
        setOpenPickDoc(false);
        setPickDocIds([]);
        if (quillRef.current) {
            quillRef.current.setText('');
        }

        const fetchEmails = async () => {
            try {
                setLoadingEmail(true);
                const res = await axios.get(`/customer/${idCustomer}/emails`);
                const fetchedTo: string[] = res.data.email_to || [];
                const fetchedCc: string[] = res.data.email_cc || [];
                setEmailsTo(fetchedTo);
                setDbEmailsTo(new Set(fetchedTo));
                setEmailsCc(fetchedCc);
                setDbEmailsCc(new Set(fetchedCc));
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingEmail(false);
            }
        };

        fetchEmails();
    }, [open, idCustomer, defaultAttachments]);

    useEffect(() => {
        if (!open) {
            quillRef.current = null;
            return;
        }
        if (!editorReady) return;
        if (!editorRef.current) return;
        if (quillRef.current && quillRef.current.root && quillRef.current.root.isConnected) return;

        const q = new Quill(editorRef.current, { theme: 'snow', modules: quillModules, placeholder: 'Tulis pesan...' });
        q.root.style.minHeight = '180px';
        if (q.container) q.container.style.minHeight = '220px';
        q.on('text-change', () => {
            setBody(q.root.innerHTML);
        });
        quillRef.current = q;
    }, [open, editorReady]);

    const addEmail = useCallback((value: string, emails: string[], setEmails: React.Dispatch<React.SetStateAction<string[]>>) => {
        const email = value.trim().toLowerCase();
        if (!email || !isValidEmail(email) || emails.includes(email)) return;
        setEmails((prev) => [...prev, email]);
    }, []);

    const removeEmail = useCallback((
        _index: number,
        _emails: string[],
        setEmails: React.Dispatch<React.SetStateAction<string[]>>,
        dbEmails: Set<string>,
    ) => {
        const emailToRemove = _emails[_index];
        // DB-sourced emails are locked — cannot be removed
        if (dbEmails.has(emailToRemove)) return;
        setEmails((prev) => prev.filter((_, i) => i !== _index));
    }, []);

    const handleAttachmentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setAttachments((prev) => {
            const next = [...prev];
            const existingNames = new Set(prev.map((item: any) => String(item.name).trim().toLowerCase()));
            files.forEach((file) => {
                const fileName = file.name.trim().toLowerCase();
                if (existingNames.has(fileName)) return;
                next.push({
                    key: `file-${file.name}-${file.lastModified}`,
                    type: 'file',
                    name: file.name,
                    label: file.name,
                    file,
                    required: false,
                });
                existingNames.add(fileName);
            });
            return next;
        });
        e.target.value = '';
    }, []);

    const removeAttachment = useCallback((key: string) => {
        setAttachments((prev) => prev.filter((item: any) => item.key !== key));
    }, []);

    const togglePickDoc = useCallback((id_dokumen: number) => {
        setPickDocIds((prev) => (prev.includes(id_dokumen) ? prev.filter((v) => v !== id_dokumen) : [...prev, id_dokumen]));
    }, []);

    const applyPickedDocs = useCallback(() => {
        setAttachments((prev) => {
            const next = [...prev];
            const existingKeys = new Set(prev.map((item: any) => item.key));
            const map = new Map<number, any>();
            uploadedDocuments.forEach((doc: any) => map.set(doc.id_dokumen, doc));
            pickDocIds.forEach((id_dokumen) => {
                const doc = map.get(id_dokumen);
                if (!doc) return;
                const key = `doc-${doc.id_dokumen}`;
                if (existingKeys.has(key)) return;
                next.push({
                    key,
                    type: 'document',
                    id_dokumen: doc.id_dokumen,
                    name: doc.nama_file,
                    label: doc.master_document?.nama_dokumen || doc.nama_file,
                    path: doc.url_path_file,
                    required: !!doc?.master_document?.is_send_email,
                });
                existingKeys.add(key);
            });
            return next;
        });
        setOpenPickDoc(false);
        setPickDocIds([]);
    }, [pickDocIds, uploadedDocuments]);

    const handleSendEmail = async () => {
        const plainBody = body.replace(/<(.|\n)*?>/g, '').trim();
        const pdfCount = Number(attachPdfOverview) + Number(attachPdfKarantina) + Number(attachPdfNonKarantina);
        if (!idSpk) return toast.error('SPK tidak ditemukan');
        if (!emailsTo.length) return toast.error('Email To wajib');
        if (!subject.trim()) return toast.error('Subject wajib');
        if (!plainBody) return toast.error('Body wajib');
        if (missingRequiredAttachments.length) return toast.error('Masih ada dokumen wajib email yang belum diupload di SPK ini');
        if (!attachments.length && pdfCount === 0) return toast.error('Attachment wajib ada');
        try {
            setSendingEmail(true);
            const formData = new FormData();
            formData.append('id_customer', String(idCustomer || ''));
            formData.append('subject', subject);
            formData.append('body', body);
            emailsTo.forEach((email) => formData.append('email_to[]', email));
            emailsCc.forEach((email) => formData.append('email_cc[]', email));
            const docIds = Array.from(new Set(attachments.filter((a: any) => a?.type === 'document').map((a: any) => a?.id_dokumen).filter(Boolean)));
            docIds.forEach((id: any) => formData.append('document_ids[]', String(id)));
            attachments.filter((a: any) => a?.type === 'file' && a?.file).forEach((a: any) => formData.append('files[]', a.file));
            if (attachPdfOverview) formData.append('attach_spk_overview_pdf', '1');
            if (attachPdfKarantina) formData.append('attach_spk_karantina_pdf', '1');
            if (attachPdfNonKarantina) formData.append('attach_spk_non_karantina_pdf', '1');
            await axios.post(`/shipping/${idSpk}/send-email`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Email sedang diproses untuk dikirim');
            onOpenChange(false);
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message || 'Gagal kirim email');
        } finally {
            setSendingEmail(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
                <DialogHeader>
                    <DialogTitle>Kirim Email</DialogTitle>
                    <DialogDescription className="sr-only">Form untuk mengirim email, menulis pesan, dan memilih lampiran dokumen.</DialogDescription>
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
                                        <div
                                            key={index}
                                            className={`px-2 py-1 rounded flex items-center gap-1 text-sm ${
                                                dbEmailsTo.has(email)
                                                    ? 'bg-gray-300 dark:bg-gray-600 dark:text-white text-gray-700'
                                                    : 'dark:text-black bg-gray-200'
                                            }`}
                                        >
                                            <span>{email}</span>
                                            {dbEmailsTo.has(email) ? (
                                                <span title="Email dari database, tidak bisa dihapus" className="text-gray-400 dark:text-gray-300 text-xs select-none">🔒</span>
                                            ) : (
                                                <button type="button" onClick={() => removeEmail(index, emailsTo, setEmailsTo, dbEmailsTo)}>x</button>
                                            )}
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
                                        <div
                                            key={index}
                                            className={`px-2 py-1 rounded flex items-center gap-1 text-sm ${
                                                dbEmailsCc.has(email)
                                                    ? 'bg-gray-300 dark:bg-gray-600 dark:text-white text-gray-700'
                                                    : 'dark:text-black bg-gray-200'
                                            }`}
                                        >
                                            <span>{email}</span>
                                            {dbEmailsCc.has(email) ? (
                                                <span title="Email dari database, tidak bisa dihapus" className="text-gray-400 dark:text-gray-300 text-xs select-none">🔒</span>
                                            ) : (
                                                <button type="button" onClick={() => removeEmail(index, emailsCc, setEmailsCc, dbEmailsCc)}>x</button>
                                            )}
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
                                <Label className="text-sm">Body</Label>
                                <div className="dark:text-black border rounded overflow-hidden bg-white [&_.ql-container]:min-h-[200px] [&_.ql-editor]:min-h-[200px] [&_.ql-editor]:text-sm [&_.ql-toolbar]:border-x-0 [&_.ql-toolbar]:border-t-0 [&_.ql-container]:border-x-0 [&_.ql-container]:border-b-0">
                                    <div ref={(el) => { editorRef.current = el; setEditorReady(!!el); }} className="min-h-[220px]" />
                                </div>
                            </div>

                            <div className="space-y-2 border rounded p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-sm">Attachments</Label>
                                    <p className="text-xs text-gray-500">Dokumen dengan is_send_email dan sudah ada di SPK otomatis dipasang di sini.</p>
                                </div>
                                <div className="flex gap-2">
                                        <Button type="button" variant="outline" onClick={() => { setPickDocIds([]); setOpenPickDoc(true); }}>
                                            Pilih Dokumen
                                        </Button>
                                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                            Tambah File
                                        </Button>
                                    </div>
                                </div>

                                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleAttachmentChange} />

                                {missingRequiredAttachments.length > 0 && (
                                    <div className="text-xs text-red-500">
                                        Dokumen wajib belum diupload: {missingRequiredAttachments.map((doc: any) => doc?.master_document?.nama_dokumen || doc?.nama_file).join(', ')}
                                    </div>
                                )}

                                <div className="border rounded p-3 space-y-2">
                                    <div>
                                        <p className="text-sm font-medium">Lampiran PDF SPK</p>
                                        <p className="text-xs text-gray-500">Centang jika ingin melampirkan PDF hasil generate dari SPK.</p>
                                    </div>
                                    <label className="flex items-center justify-between gap-3 cursor-pointer">
                                        <span className="text-sm">SPK Overview (Report)</span>
                                        <input type="checkbox" checked={attachPdfOverview} onChange={(e) => setAttachPdfOverview(e.target.checked)} />
                                    </label>
                                    <label className="flex items-center justify-between gap-3 cursor-pointer">
                                        <span className="text-sm">SPK Karantina (Template)</span>
                                        <input type="checkbox" checked={attachPdfKarantina} onChange={(e) => setAttachPdfKarantina(e.target.checked)} />
                                    </label>
                                    <label className="flex items-center justify-between gap-3 cursor-pointer">
                                        <span className="text-sm">SPK Non Karantina (Template)</span>
                                        <input type="checkbox" checked={attachPdfNonKarantina} onChange={(e) => setAttachPdfNonKarantina(e.target.checked)} />
                                    </label>
                                </div>

                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {attachments.map((file: any) => (
                                        <div key={file.key} className="border rounded px-3 py-2 flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm truncate">{file.label}</p>
                                                <p className="text-xs text-gray-500">{file.required ? 'Wajib kirim' : 'Tambahan'}</p>
                                            </div>
                                            {file.required ? <span className="text-xs text-gray-400">wajib</span> : <button type="button" onClick={() => removeAttachment(file.key)}>x</button>}
                                        </div>
                                    ))}
                                    {!attachments.length && <p className="text-sm text-gray-400">Belum ada attachment</p>}
                                </div>
                            </div>
                            <Button onClick={handleSendEmail} disabled={sendingEmail}>
                                {sendingEmail ? 'Mengirim...' : 'Kirim'}
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>

            <Dialog open={openPickDoc} onOpenChange={setOpenPickDoc}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Pilih Dokumen Uploaded</DialogTitle>
                        <DialogDescription className="sr-only">Pilih dokumen yang sudah diupload untuk dipasang sebagai attachment email.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                        {pickableDocuments.length === 0 ? (
                            <p className="text-sm text-gray-400">Tidak ada dokumen opsional yang bisa dipilih</p>
                        ) : (
                            pickableDocuments.map((doc: any) => (
                                <label key={doc.id_dokumen} className="flex items-center justify-between gap-3 border rounded px-3 py-2 cursor-pointer">
                                    <div className="min-w-0">
                                        <p className="text-sm truncate">{doc.master_document?.nama_dokumen || doc.nama_file}</p>
                                        <p className="text-xs text-gray-500">Opsional</p>
                                    </div>
                                    <input type="checkbox" checked={pickDocIds.includes(doc.id_dokumen)} onChange={() => togglePickDoc(doc.id_dokumen)} />
                                </label>
                            ))
                        )}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setOpenPickDoc(false)}>Batal</Button>
                        <Button type="button" onClick={applyPickedDocs}>Pasang</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
