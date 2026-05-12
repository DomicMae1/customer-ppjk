/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResettableDropzone } from '@/components/ResettableDropzone';
import { ResettableDropzoneImage } from '@/components/ResettableDropzoneImage';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MemoizedInput } from '@/components/ui/memoized-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { AlertTriangle, Archive, ChevronDown, ChevronUp, CircleHelp, FileText, Play, Plus, Save, Search, Trash2, Undo2, X } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import EmailModal from './components/EmailModal';

interface HsCodeItem {
    id: number;
    code: string;
    link: string | null;
    file?: File | null;
}

interface ShipmentData {
    id_spk: number;
    spkNumber: string;
    shipmentType: string;
    is_internal: boolean;
    internal_can_upload?: boolean;
    validated_by?: number;
    spkDate: string;
    type: string;
    siNumber: string;
    status: string;
    penjaluran: string | null;
    register_date?: string;
    eta_date?: string;
    shipper?: string;
    consignee?: string;
    vessel?: string;
    origin?: string;
    port_of_loading?: string;
    port?: string;
    comodity?: string;
    aju?: string;
    j_o?: string;
    parties?: any[];
    register_number?: string;
    hsCodes: HsCodeItem[];
    updated_by_name?: string | null;
    job_date?: string;
    inspection_date?: string;
    is_npd?: boolean;
    npd_date?: string | null;
}

interface DocumentTrans {
    id: number;
    id_dokumen: number;
    id_spk: number;
    id_section: number;
    upload_by: string;
    nama_file: string;
    url_path_file?: string;
    logs: string;
    link_url_video_file?: string;
    import_mandatory: boolean;
    export_mandatory: boolean;
    created_at: string;
    master_document?: {
        id_dokumen: number;
        nama_dokumen: string;
        description_file?: string;
        link_path_example_file?: string;
        link_path_template_file?: string;
        link_url_video_file?: string;
        is_confirmed?: boolean; // Added
        is_ori?: boolean; // Added
    };
    verify?: boolean | null;
    kuota_revisi?: number;
    correction_attachment?: boolean;
    correction_description?: string;
    correction_attachment_file?: string;
    is_internal?: boolean; // Added
    is_verification?: boolean; // Added
    is_ori?: boolean; // Added
    ori_date?: string | null;
    upload_date?: string | null;
    verified_date?: string | null;
}

// Interface untuk Section Transaksional (dari DB Tenant)
interface SectionTrans {
    id: number; // ID unik section transaksi
    id_section: number; // ID referensi master section
    section_name: string;
    section_order: number;
    deadline: boolean;
    deadline_date?: string | null; // NEW: Tanggal deadline per section
    sla?: string | null;
    documents: DocumentTrans[];
}

interface MasterDocument {
    id_dokumen: number;
    nama_file: string;
    description_file?: string;
    link_path_example_file?: string;
    link_path_template_file?: string;
    link_url_video_file?: string;
    import_mandatory: boolean;
    export_mandatory: boolean;
}

interface MasterSection {
    id_section: number;
    section_name: string;
    section_order: number;
    master_documents: MasterDocument[];
}

interface Props {
    customer: any;
    shipmentDataProp: ShipmentData;
    sectionsTransProp: SectionTrans[];
    masterDocProp?: MasterDocument[];
    masterSecProp?: MasterSection[];
    userRole?: string;
    internalStaff?: any[];
}

//helper untuk video link youtube
const getYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
};

export default function ViewCustomerForm({
    customer,
    shipmentDataProp,
    sectionsTransProp, // Data Section Transaksional
    masterDocProp, // Data Master Document (opsional, untuk fallback help)
    userRole, // NEW: User role for role-based visibility
    internalStaff = [], // NEW: Internal Staff list for supervisor
}: Props) {
    console.log("RENDER PARENT");
    const { props } = usePage();
    const trans = props.trans_general as Record<string, string>;
    const currentLocale = props.locale as string;
    const flash = props.flash as any;

    // Check if user is internal (not external)
    const auth = (props.auth as any) || {};
    const isInternalUser = userRole !== 'eksternal';
    const isSupervisor = auth.user?.permissions?.includes('assign_staff-master-shipping');
    const canDeleteFile = auth.user?.permissions?.includes('delete-shipping-document') || auth.user?.role === 'admin';
    const isNpdSection = (section: any) => section.section_name.toLowerCase().includes('npd');
    const [tempFiles, setTempFiles] = useState<Record<number, string>>({});
    const [activeSection, setActiveSection] = useState<number | null>(null);
    const [isAdditionalDocsOpen, setIsAdditionalDocsOpen] = useState(true);
    const [isAdditionalSectionVisible, setIsAdditionalSectionVisible] = useState(false);

    const [openEmailModal, setOpenEmailModal] = useState(false);

    const additionalSection = useMemo(() => sectionsTransProp?.find(
        (s: SectionTrans) => s.section_name.toLowerCase().includes('additional') || s.section_name.toLowerCase().includes('tambahan'),
    ), [sectionsTransProp]);

    const mainSections = useMemo(() => sectionsTransProp?.filter(
        (s: SectionTrans) => !s.section_name.toLowerCase().includes('additional') && !s.section_name.toLowerCase().includes('tambahan'),
    ), [sectionsTransProp]);

    const [isEditingHsCodes, setIsEditingHsCodes] = useState(false);
    const [hsCodes, setHsCodes] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false); // State untuk buka/tutup modal
    const [searchQuery, setSearchQuery] = useState(''); // State untuk search bar
    const [deadlineDate, setDeadlineDate] = useState(''); // State untuk tanggal deadline (additional docs)

    // NEW: Add Documents Modal States
    const [availableDocuments, setAvailableDocuments] = useState<any[]>([]);
    const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
    const [currentSectionId, setCurrentSectionId] = useState<number | null>(null);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);
    const [isSavingDocs, setIsSavingDocs] = useState(false);

    //Modal Sections
    const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
    const [availableSections, setAvailableSections] = useState<any[]>([]);
    const [selectedSections, setSelectedSections] = useState<number[]>([]);
    const [isLoadingSections, setIsLoadingSections] = useState(false);
    const [isSavingSections, setIsSavingSections] = useState(false);
    const [sectionSearchQuery, setSectionSearchQuery] = useState('');

    // NEW: Deadline Date Feature States
    const [useUnifiedDeadline, setUseUnifiedDeadline] = useState(true); // Checkbox: apply same deadline to all
    const [globalDeadlineDate, setGlobalDeadlineDate] = useState(''); // Global deadline (garis kuning)
    const [sectionDeadlines, setSectionDeadlines] = useState<Record<number, string>>({}); // Per-section deadlines (garis orange)
    const [isSavingDeadline, setIsSavingDeadline] = useState(false);
    const [isAssigningStaff, setIsAssigningStaff] = useState(false);
    const [isProcessingHsCodesEdit, setIsProcessingHsCodesEdit] = useState(false);
    // Ref: tracks whether deadline states have been initialized from DB (so we don't override user edits on prop reload)
    const isDeadlineInitialized = useRef(false);

    const [helpModalOpen, setHelpModalOpen] = useState(false);
    const [selectedHelpData, setSelectedHelpData] = useState<MasterDocument | null>(null);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const videoUrl = selectedHelpData?.link_url_video_file;
    const videoId = videoUrl ? getYouTubeId(videoUrl) : null;
    const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;

    const [deadlines, setDeadlines] = useState<Record<number, string>>({});

    // New State for Staff Assignment
    const [selectedStaff, setSelectedStaff] = useState<string>(shipmentDataProp?.validated_by ? String(shipmentDataProp.validated_by) : '');

    // Toggle internal_can_upload
    const [internalCanUpload, setInternalCanUpload] = useState<boolean>(shipmentDataProp?.internal_can_upload ?? false);
    const [isUpdatingUploadMode, setIsUpdatingUploadMode] = useState(false);

    // Verification states
    const [verifyingDocId, setVerifyingDocId] = useState<number | null>(null);
    const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
    const [rejectingDocId, setRejectingDocId] = useState<number | null>(null);

    // New State for formulir penerimaan dokumen
    const [shipperForm, setShipperForm] = useState<string>((shipmentDataProp as any)?.shipper || '');
    const [consigneeForm, setConsigneeForm] = useState<string>((shipmentDataProp as any)?.consignee || customer?.nama_perusahaan || '');
    const [blNumForm, setBlNumForm] = useState<string>(shipmentDataProp?.spkNumber || '');
    const [vesselForm, setVesselForm] = useState<string>((shipmentDataProp as any)?.vessel || '');
    const [originForm, setOriginForm] = useState<string>((shipmentDataProp as any)?.origin || '');
    const [portOfLoadingForm, setPortOfLoadingForm] = useState<string>((shipmentDataProp as any)?.port_of_loading || '');
    const [portForm, setPortForm] = useState<string>((shipmentDataProp as any)?.port || '');
    const [comodityForm, setComodityForm] = useState<string>((shipmentDataProp as any)?.comodity || '');
    const [parties, setParties] = useState<any[]>(
        (shipmentDataProp as any)?.parties?.length > 0
            ? (shipmentDataProp as any).parties
            : [{ party_type: 'FCL', party_category: '1 - GENERAL / DRY CARGO', party_qty: '', party_size: '20 ft' }]
    );
    const [ajuForm, setAjuForm] = useState<string>((shipmentDataProp as any)?.aju || '');
    const [joForm, setJoForm] = useState<string>((shipmentDataProp as any)?.j_o || '');

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    // Auto save effect
    const isFormFieldsInitialMount = useRef(true);
    useEffect(() => {
        if (isFormFieldsInitialMount.current) {
            isFormFieldsInitialMount.current = false;
            return;
        }

        const timeoutId = setTimeout(() => {
            axios.post(`/shipping/${shipmentDataProp.id_spk}/update-form-fields`, {
                shipper: shipperForm,
                consignee: consigneeForm,
                vessel: vesselForm,
                origin: originForm,
                port_of_loading: portOfLoadingForm,
                port: portForm,
                comodity: comodityForm,
                parties: parties,
                aju: ajuForm,
                j_o: joForm
            })
                .catch(error => {
                    console.error("Auto-save formulir penerimaan dokumen gagal", error);
                });
        }, 3000);

        return () => clearTimeout(timeoutId);
    }, [shipmentDataProp.id_spk, shipperForm, consigneeForm, vesselForm, originForm, portOfLoadingForm, portForm, comodityForm, parties, ajuForm, joForm]);

    // Batch Verification State
    const [pendingVerifications, setPendingVerifications] = useState<number[]>([]);

    // Batch Rejection State
    type PendingRejection = { docId: number; note: string; file: File | null };
    const [pendingRejections, setPendingRejections] = useState<PendingRejection[]>([]);

    // Expandable History State (External/Internal)
    const [openHistoryIds, setOpenHistoryIds] = useState<number[]>([]);

    // History Modal states
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedHistoryDocs, setSelectedHistoryDocs] = useState<DocumentTrans[]>([]);
    const [selectedHistoryTitle, setSelectedHistoryTitle] = useState('');

    // Remove Section Modal states
    const [isRemoveSectionModalOpen, setIsRemoveSectionModalOpen] = useState(false);
    const [sectionToRemove, setSectionToRemove] = useState<any>(null);
    const [isRemovingSection, setIsRemovingSection] = useState(false);

    // New State for Verification Confirmation
    const [confirmVerifyModalOpen, setConfirmVerifyModalOpen] = useState(false);
    const [docToVerify, setDocToVerify] = useState<DocumentTrans | null>(null);

    // New State for Remove Document from Section Confirmation
    const [isRemoveDocumentModalOpen, setIsRemoveDocumentModalOpen] = useState(false);
    const [documentToRemove, setDocumentToRemove] = useState<DocumentTrans | null>(null);
    const [isRemovingDocument, setIsRemovingDocument] = useState(false);

    // ETA Date State
    const [etaDate, setEtaDate] = useState(shipmentDataProp?.eta_date ? shipmentDataProp.eta_date.split('T')[0].split(' ')[0] : '');
    const [isSavingEtaDate, setIsSavingEtaDate] = useState(false);

    // Job Date & Inspection Date States
    const [jobDate, setJobDate] = useState(shipmentDataProp?.job_date ? shipmentDataProp.job_date.split('T')[0].split(' ')[0] : '');
    const [isSavingJobDate, setIsSavingJobDate] = useState(false);
    const [inspectionDate, setInspectionDate] = useState(shipmentDataProp?.inspection_date ? shipmentDataProp.inspection_date.split('T')[0].split(' ')[0] : '');
    const [isSavingInspectionDate, setIsSavingInspectionDate] = useState(false);

    // NPD States
    const [isNpd, setIsNpd] = useState(shipmentDataProp?.is_npd || false);
    const [npdDate, setNpdDate] = useState(shipmentDataProp?.npd_date ? shipmentDataProp.npd_date.split('T')[0].split(' ')[0] : '');
    const [isNpdModalOpen, setIsNpdModalOpen] = useState(false);
    const [isUpdatingNpd, setIsUpdatingNpd] = useState(false);
    const [npdSectionId, setNpdSectionId] = useState<number | null>(null);
    const [npdMandatoryDocs, setNpdMandatoryDocs] = useState<any[]>([]);
    const [npdAdditionalDocs, setNpdAdditionalDocs] = useState<any[]>([]);
    const [npdSelectedAdditionalDocs, setNpdSelectedAdditionalDocs] = useState<number[]>([]);
    const [npdTempFiles, setNpdTempFiles] = useState<Record<number, string>>({});
    const [isLoadingNpd, setIsLoadingNpd] = useState(false);

    const handleNpdChange = async (checked: boolean) => {
        if (!checked) {
            setIsUpdatingNpd(true);
            try {
                const response = await axios.post(`/shipping/${shipmentDataProp.id_spk}/update-npd`, {
                    is_npd: false,
                    npd_date: null,
                    id_section: null,
                    attachments: {}
                });
                if (response.data.success) {
                    setIsNpd(false);
                    setNpdDate('');
                    toast.success('NPD dinonaktifkan');
                } else {
                    toast.error(response.data.message || 'Gagal mengubah NPD');
                }
            } catch (error: any) {
                toast.error(error.response?.data?.message || 'Gagal mengubah NPD');
            } finally {
                setIsUpdatingNpd(false);
            }
        } else {
            setIsNpdModalOpen(true);
            setIsLoadingNpd(true);
            setNpdTempFiles({});
            try {
                const res = await axios.get(`/shipping/${shipmentDataProp.id_spk}/npd-info`);
                if (res.data.success) {
                    setNpdSectionId(res.data.id_section);
                    setNpdMandatoryDocs(res.data.mandatory_docs || []);
                    setNpdAdditionalDocs(res.data.additional_docs || []);
                    setNpdSelectedAdditionalDocs([]);
                } else {
                    toast.error(res.data.message || 'Gagal memuat info NPD');
                    setIsNpdModalOpen(false);
                }
            } catch (error: any) {
                toast.error(error.response?.data?.message || 'Gagal memuat info NPD');
                setIsNpdModalOpen(false);
            } finally {
                setIsLoadingNpd(false);
            }
        }
    };

    const handleSaveNpdModal = async () => {
        if (!npdDate) {
            toast.warning('Silakan isi tanggal NPD');
            return;
        }

        setIsUpdatingNpd(true);
        try {
            const response = await axios.post(`/shipping/${shipmentDataProp.id_spk}/update-npd`, {
                is_npd: true,
                npd_date: npdDate,
                id_section: npdSectionId,
                attachments: npdTempFiles,
                additional_documents: npdSelectedAdditionalDocs
            });

            if (response.data.success) {
                toast.success('NPD berhasil disimpan');
                setIsNpdModalOpen(false);
                setIsNpd(true);
                router.reload({ only: ['sectionsTransProp', 'shipmentDataProp', 'documents'] });
            } else {
                toast.error(response.data.message || 'Gagal menyimpan NPD');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Gagal menyimpan NPD');
        } finally {
            setIsUpdatingNpd(false);
        }
    };

    // Ori Date Modal State
    const [isOriDateModalOpen, setIsOriDateModalOpen] = useState(false);
    const [oriDateValues, setOriDateValues] = useState<Record<number, string>>({});
    const [isSavingOriDates, setIsSavingOriDates] = useState(false);
    const [bulkOriDate, setBulkOriDate] = useState('');
    const [selectedOriDocIds, setSelectedOriDocIds] = useState<number[]>([]);

    // Gather all documents from all sections for the ori date modal
    // Filtered by is_ori and taking only the latest version per id_dokumen
    const allDocumentsForOriDate = useMemo(() => {
        const flatList = (sectionsTransProp || []).flatMap((section) =>
            (section.documents || [])
                .filter((doc) => !!doc.master_document?.is_ori)
                .map((doc) => ({
                    ...doc,
                    sectionName: section.section_name,
                }))
        );

        // Group by id_dokumen and take the newest one (highest ID)
        const groups = new Map<number, any>();
        flatList.forEach((doc) => {
            const existing = groups.get(doc.id_dokumen);
            if (!existing || doc.id > existing.id) {
                groups.set(doc.id_dokumen, doc);
            }
        });

        return Array.from(groups.values());
    }, [sectionsTransProp]);

    // Initialize ori date values when modal opens
    const openOriDateModal = () => {
        const initialValues: Record<number, string> = {};
        allDocumentsForOriDate.forEach((doc) => {
            initialValues[doc.id] = doc.ori_date ? doc.ori_date.split('T')[0].split(' ')[0] : '';
        });
        setOriDateValues(initialValues);
        setBulkOriDate('');
        setSelectedOriDocIds([]);
        setIsOriDateModalOpen(true);
    };

    const toggleOriDocSelection = (docId: number) => {
        setSelectedOriDocIds((prev) =>
            prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
        );
    };

    const toggleSelectAllOriDocs = () => {
        if (selectedOriDocIds.length === allDocumentsForOriDate.length) {
            setSelectedOriDocIds([]);
        } else {
            setSelectedOriDocIds(allDocumentsForOriDate.map((d) => d.id));
        }
    };

    const applyBulkOriDate = (mode: 'all' | 'selected') => {
        if (!bulkOriDate) return;
        setOriDateValues((prev) => {
            const updated = { ...prev };
            const targetIds = mode === 'all' ? allDocumentsForOriDate.map((d) => d.id) : selectedOriDocIds;
            targetIds.forEach((id) => {
                updated[id] = bulkOriDate;
            });
            return updated;
        });
    };

    const handleSaveOriDates = async () => {
        setIsSavingOriDates(true);
        try {
            const payload = Object.entries(oriDateValues)
                .filter(([, value]) => value !== '')
                .map(([docId, date]) => ({ doc_id: parseInt(docId), ori_date: date }));

            await axios.post(`/shipping/${shipmentDataProp.id_spk}/update-ori-dates`, { documents: payload });
            toast.success(trans.ori_date_saved || 'Tanggal ORI berhasil disimpan');
            setIsOriDateModalOpen(false);
            router.reload({ only: ['sectionsTransProp'] });
        } catch (error) {
            console.error('Failed to save ori dates', error);
            toast.error(trans.ori_date_save_failed || 'Gagal menyimpan tanggal ORI');
        } finally {
            setIsSavingOriDates(false);
        }
    };

    useEffect(() => {
        if (helpModalOpen) {
            setIsVideoPlaying(false);
        }
    }, [helpModalOpen, selectedHelpData]);

    // NEW: Debounced Reload & Listener persistence
    const reloadTimeoutRef = useRef<any>(null);
    const isReloadingRef = useRef(false);
    const isSavingRef = useRef(false);

    useEffect(() => {
        if (!shipmentDataProp?.id_spk) return;

        const echo = (window as any).Echo;
        if (!echo) return;

        const channelName = `shipping.${shipmentDataProp.id_spk}`;
        const channel = echo.private(channelName);

        channel.listen('ShippingDataUpdated', (e: any) => {
            // Suppress real-time reloads if we are currently manually saving
            // This prevents the "duplicate reload" effect when a save also triggers an event
            if (isSavingRef.current) return;

            // Debounce the reload to handle rapid successive events (Event Storm)
            if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current);

            reloadTimeoutRef.current = setTimeout(() => {
                if (isReloadingRef.current) return;

                isReloadingRef.current = true;

                router.reload({
                    only: ['sectionsTransProp', 'shipmentDataProp'],
                    onFinish: () => {
                        isReloadingRef.current = false;
                    },
                });
            }, 800); // 800ms debounce
        });

        return () => {
            echo.leave(channelName);
            if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current);
        };
    }, [shipmentDataProp.id_spk]); // Only depend on the ID to prevent re-subscribing on data change

    // Initialize deadline states from database data (only once, on first load)
    useEffect(() => {
        if (!sectionsTransProp?.length || isDeadlineInitialized.current) return;

        const deadlinesFromDb: Record<number, string> = {};
        let hasAnyDeadline = false;
        let firstDeadline = '';
        let allSameDeadline = true;

        sectionsTransProp.forEach((section: SectionTrans) => {
            if (section.deadline_date) {
                const dateStr = String(section.deadline_date);
                const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
                const dateValue = match ? `${match[1]}-${match[2]}-${match[3]}` : '';
                if (dateValue) {
                    deadlinesFromDb[section.id] = dateValue;
                    if (!hasAnyDeadline) {
                        firstDeadline = dateValue;
                        hasAnyDeadline = true;
                    } else if (dateValue !== firstDeadline) {
                        allSameDeadline = false;
                    }
                }
            }
        });

        if (Object.keys(deadlinesFromDb).length > 0) setSectionDeadlines(deadlinesFromDb);
        if (hasAnyDeadline && allSameDeadline) {
            setGlobalDeadlineDate(firstDeadline);
            setUseUnifiedDeadline(true);
        } else if (hasAnyDeadline) {
            setUseUnifiedDeadline(false);
        }

        isDeadlineInitialized.current = true;
    }, [sectionsTransProp]);

    // Auto-show Additional Document section if files exist
    useEffect(() => {
        if (additionalSection?.documents?.some((d) => d.url_path_file)) {
            setIsAdditionalSectionVisible(true);
        }
    }, [additionalSection]);

    // NEW: Sync ETA Date for real-time updates
    useEffect(() => {
        if (shipmentDataProp?.eta_date) {
            setEtaDate(shipmentDataProp.eta_date.split('T')[0].split(' ')[0]);
        }
    }, [shipmentDataProp?.eta_date]);

    // NEW: Sync Job Date for real-time updates
    useEffect(() => {
        if (shipmentDataProp?.job_date) {
            setJobDate(shipmentDataProp.job_date.split('T')[0].split(' ')[0]);
        }
    }, [shipmentDataProp?.job_date]);

    // NEW: Sync Inspection Date for real-time updates
    useEffect(() => {
        if (shipmentDataProp?.inspection_date) {
            setInspectionDate(shipmentDataProp.inspection_date.split('T')[0].split(' ')[0]);
        }
    }, [shipmentDataProp?.inspection_date]);

    // AUTO-SAVE: ETA Date
    const isEtaInitialMount = useRef(true);
    useEffect(() => {
        if (isEtaInitialMount.current) {
            isEtaInitialMount.current = false;
            return;
        }

        // Only save if the value is different from prop to avoid unnecessary calls
        const propValue = shipmentDataProp?.eta_date ? shipmentDataProp.eta_date.split('T')[0].split(' ')[0] : '';
        if (etaDate === propValue) return;

        const timeoutId = setTimeout(() => {
            handleSaveEtaDate();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [etaDate]);

    // AUTO-SAVE: Job Date
    const isJobInitialMount = useRef(true);
    useEffect(() => {
        if (isJobInitialMount.current) {
            isJobInitialMount.current = false;
            return;
        }

        const propValue = shipmentDataProp?.job_date ? shipmentDataProp.job_date.split('T')[0].split(' ')[0] : '';
        if (jobDate === propValue) return;

        const timeoutId = setTimeout(() => {
            handleSaveJobDate();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [jobDate]);

    // AUTO-SAVE: Inspection Date
    const isInspectionInitialMount = useRef(true);
    useEffect(() => {
        if (isInspectionInitialMount.current) {
            isInspectionInitialMount.current = false;
            return;
        }

        const propValue = shipmentDataProp?.inspection_date ? shipmentDataProp.inspection_date.split('T')[0].split(' ')[0] : '';
        if (inspectionDate === propValue) return;

        const timeoutId = setTimeout(() => {
            handleSaveInspectionDate();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [inspectionDate]);

    const [processingSectionId, setProcessingSectionId] = useState<number | null>(null);

    const [selectedAdditionalDocs, setSelectedAdditionalDocs] = useState<{ id: string; label: string }[]>([
        { id: 'fumigasi', label: 'Fumigasi' },
        { id: 'bpom', label: 'BPOM' },
    ]);

    const [tempSelectedDocs, setTempSelectedDocs] = useState<string[]>(['fumigasi', 'bpom']);

    const shipmentData = shipmentDataProp || {
        spkDate: '-',
        type: '-',
        spkNumber: '-',
        hsCodes: [],
        is_created_by_internal: false,
    };

    const additionalDocsList = [
        { id: 'phyto', label: 'Phytosanitary' },
        { id: 'health', label: 'Health Certificate' },
        { id: 'fumigasi', label: 'Fumigasi' },
        { id: 'coo', label: 'COO' },
        { id: 'rekom', label: 'Surat Rekomendasi' },
        { id: 'bpom', label: 'BPOM' },
        { id: 'pi', label: 'PI' },
        { id: 'ls', label: 'LS' },
    ];

    const filteredDocs = additionalDocsList.filter((doc) => doc.label.toLowerCase().includes(searchQuery.toLowerCase()));

    const enableEditMode = () => {
        // Copy data dari props ke state edit form
        const initialData = shipmentData.hsCodes.map((item: any) => ({
            id: item.id || nanoid(),
            code: item.code,
            link: item.link,
            file: null, // Reset file input karena file object tidak bisa didapat dari backend
        }));

        // Jika kosong, sediakan 1 field kosong
        setHsCodes(initialData.length ? initialData : [{ id: nanoid(), code: '', link: '', file: null }]);
        setIsEditingHsCodes(true);
    };

    const cancelEditMode = () => {
        setIsEditingHsCodes(false);
        setHsCodes([]); // Reset state form
    };

    const updateHsCode = (id: any, field: keyof HsCodeItem, value: any) => {
        setHsCodes(hsCodes.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    };

    const removeHsCodeField = (id: any) => {
        setHsCodes(hsCodes.filter((item) => item.id !== id));
    };

    const addHsCodeField = () => {
        setHsCodes([...hsCodes, { id: nanoid(), code: '', link: null, file: null }]);
    };

    const handleSaveEdit = () => {
        setIsProcessingHsCodesEdit(true);
        const formData = {
            hs_codes: hsCodes.map((item) => ({
                id: typeof item.id === 'number' ? item.id : null, // Kirim ID jika numeric (lama), null jika string/nanoid (baru)
                code: item.code,
                file: item.file, // File object (jika baru diupload)
            })),
        };

        router.post(
            `/shipping/${shipmentData.id_spk}/update-hs-codes`, // URL sesuai route web.php
            formData,
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    setIsEditingHsCodes(false);
                    setIsProcessingHsCodesEdit(false);
                },
                onError: (errors) => {
                    toast.error('Gagal menyimpan perubahan. Periksa inputan Anda.');
                    console.error(errors);
                    setIsProcessingHsCodesEdit(false);
                },
            },
        );
    };

    // Verification Handlers
    const toggleVerificationState = (documentId: number) => {
        setPendingVerifications((prev) => {
            if (prev.includes(documentId)) {
                return prev.filter((id) => id !== documentId);
            } else {
                // Clear rejection data if we are verifying this document
                setPendingRejections((rej) => rej.filter((r) => r.docId !== documentId));
                return [...prev, documentId];
            }
        });
    };

    const handleVerify = (doc: DocumentTrans) => {
        const isCurrentlyPending = pendingVerifications.includes(doc.id);

        // Jika mau mencentang (accept) dan dokumen butuh konfirmasi
        if (!isCurrentlyPending && doc.master_document?.is_confirmed) {
            setDocToVerify(doc);
            setConfirmVerifyModalOpen(true);
        } else {
            toggleVerificationState(doc.id);
        }
    };

    const handleOpenReject = (documentId: number) => {
        setRejectingDocId(documentId);
        setRejectionModalOpen(true);
    };

    const handleSubmitReject = (docId: number, note: string, file: File | null) => {
        if (!docId || !note.trim()) {
            toast.warning('Please provide a rejection reason');
            return;
        }

        // Store rejection in local state instead of sending immediately
        setPendingRejections((prev) => {
            // Remove existing rejection for this doc if exists (overwrite)
            const filtered = prev.filter((r) => r.docId !== docId);
            return [
                ...filtered,
                {
                    docId: docId,
                    note: note,
                    file: file,
                },
            ];
        });

        // Also remove from pending verifications if it was there
        setPendingVerifications((prev) => prev.filter((id) => id !== docId));

        setRejectionModalOpen(false);
        setRejectingDocId(null);
    };

    const handleOpenHelp = (docTrans: DocumentTrans) => {
        let helpData = null;
        if (docTrans.master_document) {
            helpData = {
                nama_file: docTrans.nama_file,
                ...docTrans.master_document,
            };
        } else if (masterDocProp && Array.isArray(masterDocProp)) {
            const foundMaster = masterDocProp.find((m: any) => String(m.id_dokumen) === String(docTrans.id_dokumen));

            if (foundMaster) {
                helpData = foundMaster;
            }
        }

        if (!helpData) {
            helpData = {
                id_dokumen: docTrans.id_dokumen,
                nama_file: docTrans.nama_file,
                description_file: undefined,
                link_path_example_file: undefined,
                link_path_template_file: undefined,
                link_url_video_file: undefined,
                import_mandatory: false,
                export_mandatory: false,
            };
        }

        setSelectedHelpData(helpData as MasterDocument);
        setHelpModalOpen(true);
    };

    const handleEditSection = (sectionId: number) => {
        setActiveSection(sectionId === activeSection ? null : sectionId);
    };

    const handleSaveSection = async (sectionId: number) => {
        if (isSavingRef.current || processingSectionId !== null) return;

        // 1. Set loading
        isSavingRef.current = true;
        setProcessingSectionId(sectionId);

        // 2. Ambil data section saat ini
        const currentSection = sectionsTransProp.find((s: SectionTrans) => s.id === sectionId);

        if (!currentSection || !currentSection.documents) {
            toast.error('Section tidak ditemukan atau kosong.');
            setProcessingSectionId(null);
            return;
        }

        // --- VALIDASI: Pastikan semua dokumen yang sudah diupload (ada url_path_file) sudah dinilai ---
        const uploadedDocs = currentSection.documents.filter((doc) => doc.url_path_file);

        // Filter dokumen yang belum dinilai:
        // - verify === null (belum dinilai dari DB)
        // - status verify != false (karena kalau false berarti rejected, sudah dinilai)
        // - TIDAK ada di pendingVerifications (berarti belum dicentang 'Accept')
        // - TIDAK ada di pendingRejections (berarti belum submit Reject)
        const unassessedDocs = uploadedDocs.filter((doc: DocumentTrans) => {
            // SKIP validation if internal_can_upload is set (Auto-verified)
            if (shipmentData.internal_can_upload) return false;

            const isAlreadyAssessed = doc.verify !== null; // True if Checked (true) or Rejected (false)
            const isPendingAccept = pendingVerifications.includes(doc.id);
            const isPendingReject = pendingRejections.some((r: PendingRejection) => r.docId === doc.id);

            // Jika sudah assessed DB, OK.
            if (isAlreadyAssessed) return false;

            // Jika belum assessed DB, tapi ada di pendingAccept/Reject, OK.
            if (isPendingAccept || isPendingReject) return false;

            // Sisanya: Belum assessed DB dan belum di centang -> Masalah.
            return true;
        });

        if (unassessedDocs.length > 0) {
            toast.error(
                `Harap verifikasi (Accept) atau tolak (Reject) semua dokumen yang telah diupload pada section ini.\n\nDokumen belum dinilai: ${unassessedDocs.length}`,
            );
            setProcessingSectionId(null);
            return;
        }

        // 3. Filter dokumen yang memiliki file temp
        const filesToProcess = currentSection.documents.filter((doc: DocumentTrans) => {
            const hasFile = tempFiles[doc.id];
            return hasFile;
        });

        try {
            // 4. PREPARE UNIFIED PAYLOAD (FormData for file support)
            const formData = new FormData();
            formData.append('spk_id', String(shipmentData.id_spk));
            formData.append('section_id', String(sectionId));
            formData.append('section_name', currentSection.section_name);

            // A. Attachments
            if (filesToProcess.length > 0) {
                filesToProcess.forEach((doc, index) => {
                    formData.append(`attachments[${index}][path]`, tempFiles[doc.id]);
                    formData.append(`attachments[${index}][document_id]`, String(doc.id));
                    formData.append(`attachments[${index}][type]`, doc.nama_file);
                });
            }

            // B. Verifications
            const docsToVerify = currentSection.documents.filter((doc) => pendingVerifications.includes(doc.id)).map((doc) => doc.id);
            if (docsToVerify.length > 0) {
                docsToVerify.forEach((id, index) => {
                    formData.append(`verified_ids[${index}]`, String(id));
                });
            }

            // C. Rejections
            const rejectionsToProcess = currentSection.documents
                .filter((doc) => pendingRejections.some((r) => r.docId === doc.id))
                .map((doc) => pendingRejections.find((r) => r.docId === doc.id))
                .filter((r): r is PendingRejection => r !== undefined);

            if (rejectionsToProcess.length > 0) {
                rejectionsToProcess.forEach((r, index) => {
                    formData.append(`rejections[${index}][doc_id]`, String(r.docId));
                    formData.append(`rejections[${index}][note]`, r.note);
                    if (r.file) {
                        formData.append(`rejections[${index}][file]`, r.file);
                    }
                });
            }
            const deadlineValue = useUnifiedDeadline
                ? globalDeadlineDate // unified: same date for all sections
                : sectionDeadlines[sectionId] || null; // per-section: specific date for this section
            if (deadlineValue) {
                formData.append('deadline', deadlineValue);
            }

            // 5. SEND UNIFIED REQUEST VIA INERTIA
            router.post('/shipping/unified-save', formData, {
                onSuccess: () => {
                    // CLEANUP STATE
                    if (filesToProcess.length > 0) {
                        const newTempFiles = { ...tempFiles };
                        filesToProcess.forEach((doc) => {
                            delete newTempFiles[doc.id];
                        });
                        setTempFiles(newTempFiles);
                    }

                    if (docsToVerify.length > 0) {
                        setPendingVerifications((prev) =>
                            prev.filter((id) => !docsToVerify.includes(id))
                        );
                    }

                    if (rejectionsToProcess.length > 0) {
                        const processedIds = rejectionsToProcess.map((r) => r.docId);
                        setPendingRejections((prev) =>
                            prev.filter((r) => !processedIds.includes(r.docId))
                        );
                    }

                    // FEEDBACK KE USER
                    toast.success('Section saved successfully');

                    // reset UI state
                    setActiveSection(null);
                },

                onError: (errors) => {
                    console.error('Save errors:', errors);

                    const message =
                        errors.message ||
                        Object.values(errors)[0]?.[0] ||
                        'Terjadi kesalahan.';

                    toast.error(message);
                },

                onFinish: () => {
                    setProcessingSectionId(null);
                    isSavingRef.current = false;
                },

                preserveState: true,
                preserveScroll: true,
                only: ['sectionsTransProp', 'shipmentDataProp'],
            });
        } catch (error: any) {
            console.error('Error saving section:', error);
            toast.error('Terjadi kesalahan saat menyimpan.');
            setProcessingSectionId(null);
            isSavingRef.current = false;
        }
    };

    const handleRemoveSection = (section: any) => {
        setSectionToRemove(section);
        setIsRemoveSectionModalOpen(true);
    };

    const confirmRemoveSection = async () => {
        if (!sectionToRemove) return;

        setIsRemovingSection(true);
        try {
            const response = await axios.post('/shipping/remove-section', {
                id_spk: shipmentData.id_spk,
                id: sectionToRemove.id,
            });

            if (response.data.success) {
                toast.success(response.data.message || 'Section berhasil dihapus');
                setIsRemoveSectionModalOpen(false);
                setSectionToRemove(null);
                router.reload({
                    only: ['sectionsTransProp'],
                });
            } else {
                toast.error(response.data.message || 'Gagal menghapus section');
            }
        } catch (error: any) {
            console.error('Error removing section:', error);
            toast.error(error.response?.data?.message || 'Gagal menghapus section');
        } finally {
            setIsRemovingSection(false);
        }
    };

    const handleModalCheckboxChange = (id: string, checked: boolean) => {
        if (checked) setTempSelectedDocs([...tempSelectedDocs, id]);
        else setTempSelectedDocs(tempSelectedDocs.filter((item) => item !== id));
    };

    const handleSaveFromModal = () => {
        const newDocs = additionalDocsList.filter((opt) => tempSelectedDocs.includes(opt.id));
        setSelectedAdditionalDocs(newDocs);
        setIsModalOpen(false);
    };

    // Helper: Group documents for rendering
    // Returns array of objects { current: Doc, history: Doc[] }
    const processDocumentsForRender = useCallback((docs: DocumentTrans[]) => {
        const groups = new Map<number, DocumentTrans[]>();

        // 1. Group by id_dokumen
        docs.forEach((doc) => {
            if (!groups.has(doc.id_dokumen)) {
                groups.set(doc.id_dokumen, []);
            }
            groups.get(doc.id_dokumen)?.push(doc);
        });

        const result: { current: DocumentTrans; history: DocumentTrans[] }[] = [];

        groups.forEach((groupDocs) => {
            // 2. Sort by ID descending (newest first)
            groupDocs.sort((a, b) => b.id - a.id);

            // 3. Current is the first one (latest)
            const current = groupDocs[0];

            // 4. History is the rest
            const history = groupDocs.slice(1);

            // Populate history for BOTH Internal and External
            result.push({ current, history });
        });

        return result;
    }, []);

    // Pre-compute processed documents per section — avoids re-running O(n log n) sort on every render
    const processedSectionDocs = useMemo(() => {
        const map = new Map<number, { current: DocumentTrans; history: DocumentTrans[] }[]>();
        sectionsTransProp?.forEach((section: SectionTrans) => {
            map.set(section.id, processDocumentsForRender(section.documents || []));
        });
        return map;
    }, [sectionsTransProp, processDocumentsForRender]);

    const toggleHistory = (id: number) => {
        setOpenHistoryIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    };

    // --- ADD DOCUMENTS MODAL HANDLERS ---
    const handleOpenModal = async (sectionId: number) => {
        setCurrentSectionId(sectionId);
        setSelectedDocuments([]);
        setSearchQuery('');
        setIsModalOpen(true);
        setIsLoadingDocs(true);

        try {
            const response = await axios.get('/shipping/available-documents', {
                params: {
                    id_spk: shipmentData.id_spk,
                    id_section: sectionId,
                },
            });

            if (response.data.success) {
                setAvailableDocuments(response.data.documents || []);
            } else {
                toast.error('Failed to load available documents');
            }
        } catch (error: any) {
            console.error('Error fetching available documents:', error);
            toast.error(error.response?.data?.message || 'Failed to load documents');
        } finally {
            setIsLoadingDocs(false);
        }
    };

    const handleDocumentCheckboxChange = (docId: number, checked: boolean) => {
        if (checked) {
            setSelectedDocuments((prev) => [...prev, docId]);
        } else {
            setSelectedDocuments((prev) => prev.filter((id) => id !== docId));
        }
    };

    const handleSaveSelectedDocuments = async () => {
        if (selectedDocuments.length === 0) {
            toast.error('Please select at least one document');
            return;
        }

        if (!currentSectionId) {
            toast.error('Section not found');
            return;
        }

        setIsSavingDocs(true);

        try {
            const response = await axios.post('/shipping/add-documents-to-section', {
                id_spk: shipmentData.id_spk,
                id_section: currentSectionId,
                document_ids: selectedDocuments,
            });

            if (response.data.success) {
                toast.success(response.data.message || 'Documents added successfully');
                setIsModalOpen(false);
                setSelectedDocuments([]);
                setCurrentSectionId(null);

                // No need to reload manually - Echo listener will handle realtime update
                // router.reload({ only: ['sectionsTransProp'] });
            } else {
                toast.error(response.data.message || 'Failed to add documents');
            }
        } catch (error: any) {
            console.error('Error adding documents:', error);
            toast.error(error.response?.data?.message || 'Failed to add documents');
        } finally {
            setIsSavingDocs(false);
        }
    };

    // Penjaluran Handler
    const [isUpdatingPenjaluran, setIsUpdatingPenjaluran] = useState(false);
    const [penjaluranModalOpen, setPenjaluranModalOpen] = useState(false);
    const [pendingJalur, setPendingJalur] = useState<'merah' | 'hijau' | null>(null);
    const [registerNumber, setRegisterNumber] = useState('');
    const [registerDate, setRegisterDate] = useState('');

    // Buka modal terlebih dahulu sebelum submit penjaluran
    const openPenjaluranModal = (jalur: 'merah' | 'hijau') => {
        setPendingJalur(jalur);
        setRegisterNumber('');
        setRegisterDate('');
        setPenjaluranModalOpen(true);
    };

    const handleUpdatePenjaluran = async () => {
        if (!pendingJalur) return;
        setIsUpdatingPenjaluran(true);
        try {
            const response = await axios.post('/shipping/update-penjaluran', {
                id_spk: shipmentData.id_spk,
                penjaluran: pendingJalur,
                register_number: registerNumber,
                register_date: registerDate,
            });

            if (response.data.success) {
                toast.success(`Penjaluran berhasil diset ke jalur ${pendingJalur}`);
                setPenjaluranModalOpen(false);
            } else {
                toast.error(response.data.message || 'Gagal update penjaluran');
            }
        } catch (error: any) {
            console.error('Error updating penjaluran:', error);
            toast.error(error.response?.data?.message || 'Gagal update penjaluran');
        } finally {
            setIsUpdatingPenjaluran(false);
        }
    };

    // Download ZIP Handler
    const [isDownloadingZip, setIsDownloadingZip] = useState(false);

    const handleRemoveDocumentClick = (doc: DocumentTrans) => {
        setDocumentToRemove(doc);
        setIsRemoveDocumentModalOpen(true);
    };

    const confirmRemoveDocument = async () => {
        if (!documentToRemove) return;
        
        setIsRemovingDocument(true);
        try {
            const response = await axios.post(`/shipping/document/${documentToRemove.id}/remove`);
            if (response.data.success || response.status === 200) {
                toast.success('Dokumen berhasil dihapus dari section');
                setIsRemoveDocumentModalOpen(false);
                setDocumentToRemove(null);
                router.reload({ only: ['sectionsTransProp'] });
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Gagal menghapus dokumen');
            console.error(error);
        } finally {
            setIsRemovingDocument(false);
        }
    };

    const handleDownloadZip = async () => {
        setIsDownloadingZip(true);
        try {
            const response = await axios.get(`/shipping/${shipmentData.id_spk}/download-zip`, {
                responseType: 'blob',
            });

            const contentDisposition = response.headers['content-disposition'] || '';
            const match = contentDisposition.match(/filename="?([^"]+)"?/);
            const fileName = match ? match[1] : `dokumen_${shipmentData.id_spk}.zip`;

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/zip' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('Dokumen berhasil diunduh!');
        } catch (error: any) {
            if (error.response?.status === 404) {
                toast.error('Belum ada dokumen yang diupload.');
            } else {
                toast.error(error.response?.data?.error || 'Gagal mengunduh dokumen.');
            }
        } finally {
            setIsDownloadingZip(false);
        }
    };

    // --- REUSABLE DOCUMENT ROW RENDERER ---
    const renderDocumentRow = (doc: DocumentTrans, idx: number, sectionId: number, hasHistory: boolean, historyDocs: DocumentTrans[]) => {
        const isSpkInternalUpload = shipmentData.internal_can_upload ?? false;
        let canUpload = false;
        let canVerify = false;

        if (isSpkInternalUpload) {
            canUpload = isInternalUser;
            canVerify = false;
        } else {
            canUpload = (isInternalUser && !!doc.is_internal) || (!isInternalUser && !doc.is_internal);
            canVerify = ((isInternalUser && !doc.is_internal) || (!isInternalUser && !!doc.is_internal)) && doc.is_verification !== false; // Hide Verify if auto-verfied
        }

        const isVerified = doc.verify === true;
        const isRejected = doc.verify === false;
        const isPending = doc.verify === null;
        const isPendingVerification = pendingVerifications.includes(doc.id);
        const isPendingRejection = pendingRejections.some((r) => r.docId === doc.id);
        const quotaExceeded = doc.kuota_revisi !== undefined && (doc.kuota_revisi ?? 0) <= 0;

        return (
            <div key={doc.id} className="relative flex flex-col gap-2 border-b border-gray-100 py-3 last:border-0 dark:border-zinc-800">
                <div className="flex items-start justify-between gap-4">
                    {/* Left: Name & History */}
                    <div className="flex flex-1 flex-col gap-1">
                        <div className="flex items-start gap-2 text-gray-800 dark:text-slate-900">
                            <span className="min-w-0 flex-1 text-sm font-medium">
                                {idx + 1}. {doc.master_document?.nama_dokumen || doc.nama_file}
                            </span>

                            <div className="flex items-center gap-1 mt-0.5">
                                <CircleHelp
                                    className="h-4 w-4 shrink-0 cursor-pointer text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                                    onClick={() => handleOpenHelp(doc)}
                                />
                                {canDeleteFile && (
                                    <Trash2
                                        className="h-4 w-4 shrink-0 cursor-pointer text-gray-400 hover:text-red-500 transition-colors"
                                        title={trans.delete_document || 'Hapus Dokumen'}
                                        onClick={() => handleRemoveDocumentClick(doc)}
                                    />
                                )}
                            </div>

                            {!canVerify && doc.url_path_file && (
                                <div className="flex shrink-0 gap-1">
                                    {isVerified && (
                                        <span className="rounded-full border border-green-200 bg-green-100 px-2.5 py-0.5 text-[10px] font-bold tracking-tight text-green-700 uppercase dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                                            {trans.verified}
                                        </span>
                                    )}
                                    {isRejected && (
                                        <span className="rounded-full border border-red-200 bg-red-100 px-2.5 py-0.5 text-[10px] font-bold tracking-tight text-red-700 uppercase dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
                                            {trans.rejected}
                                        </span>
                                    )}
                                    {isPending && (
                                        <span className="rounded-full border border-yellow-200 bg-yellow-100 px-2.5 py-0.5 text-[10px] font-bold tracking-tight text-yellow-700 uppercase dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
                                            {trans.pending}
                                        </span>
                                    )}
                                    {doc.master_document?.is_ori && doc.ori_date && (
                                        <span className="rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold tracking-tight text-blue-700 uppercase dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400">
                                            ORI: {new Date(doc.ori_date).toLocaleDateString(`${trans.locale}`, { day: 'numeric', month: 'short' })}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* File & History Trigger */}
                        {doc.url_path_file ? (
                            <div className="ml-5">
                                <button
                                    onClick={() => toggleHistory(doc.id)}
                                    className="flex items-center gap-1 rounded bg-black px-2 py-1 text-xs text-white transition-colors hover:bg-gray-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
                                >
                                    <FileText className="h-3 w-3" /> {trans.latest_file || 'Latest File'}
                                    {openHistoryIds.includes(doc.id) ? (
                                        <ChevronUp className="ml-1 h-3 w-3" />
                                    ) : (
                                        <ChevronDown className="ml-1 h-3 w-3" />
                                    )}
                                </button>

                                {/* History Dropdown */}
                                {openHistoryIds.includes(doc.id) && (
                                    <div className="mt-2 flex flex-col gap-1 border-l-2 border-gray-200 pl-2 dark:border-zinc-700">
                                        {historyDocs
                                            .filter((v) => v.url_path_file)
                                            .map((v, vIdx, arr) => (
                                                <div key={v.id} className="flex items-center gap-2 text-xs">
                                                    <span className="font-bold text-gray-500 dark:text-zinc-500">v{arr.length - vIdx}</span>
                                                    <a
                                                        href={`/file/view/${v.url_path_file}`}
                                                        target="_blank"
                                                        className={`transition-colors hover:underline ${vIdx === 0 ? 'font-bold text-black dark:text-black' : 'text-gray-600 dark:text-zinc-400'}`}
                                                    >
                                                        {v.nama_file}
                                                    </a>
                                                    <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                                                        {new Date(v.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className="ml-5 text-xs text-gray-400 italic dark:text-zinc-500">{trans.no_file || 'No file uploaded'}</span>
                        )}
                    </div>

                    {/* Middle: Verify Actions (Checkbox Container) */}
                    {canVerify && doc.url_path_file && (
                        <div className="flex items-center gap-4 rounded-lg border border-gray-100 bg-gray-50 p-2 dark:border-zinc-800 dark:bg-zinc-900/50">
                            <div className="flex flex-col items-center gap-1">
                                <span
                                    className={`text-[10px] font-bold uppercase ${isVerified || isPendingVerification ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-zinc-500'}`}
                                >
                                    {trans.accept || 'Accept'}
                                </span>
                                <Checkbox
                                    checked={isVerified || isPendingVerification}
                                    onCheckedChange={() => handleVerify(doc)}
                                    className="border-gray-300 data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600 dark:border-zinc-700 dark:data-[state=checked]:border-green-500 dark:data-[state=checked]:bg-green-500"
                                    disabled={!isPending}
                                />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span
                                    className={`text-[10px] font-bold uppercase ${isRejected || isPendingRejection ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-zinc-500'}`}
                                >
                                    {trans.reject || 'Reject'}
                                </span>
                                <Checkbox
                                    checked={isRejected || isPendingRejection}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            handleOpenReject(doc.id);
                                        } else {
                                            // Clear pending rejection if unchecked
                                            setPendingRejections((prev) => prev.filter((r) => r.docId !== doc.id));
                                        }
                                    }}
                                    className="border-gray-300 data-[state=checked]:border-red-600 data-[state=checked]:bg-red-600 dark:border-zinc-700 dark:data-[state=checked]:border-red-500 dark:data-[state=checked]:bg-red-500"
                                    disabled={!isPending}
                                />
                            </div>
                        </div>
                    )}

                    {/* Right: Upload Zone & Notes */}
                    {canUpload && (
                        <div className="flex w-1/2 max-w-[200px] flex-col items-end gap-2">
                            {!doc.url_path_file || (!isPending && !quotaExceeded) ? (
                                <ResettableDropzone
                                    label=""
                                    isRequired={false}
                                    className="dark:border-zinc-700 dark:bg-zinc-900"
                                    existingFile={
                                        tempFiles[doc.id]
                                            ? { nama_file: doc.master_document?.nama_dokumen || doc.nama_file, path: tempFiles[doc.id] }
                                            : undefined
                                    }
                                    uploadConfig={{
                                        url: '/shipping/upload-temp',
                                        payload: { type: doc.master_document?.nama_dokumen || doc.nama_file, spk_code: shipmentData.spkNumber },
                                    }}
                                    onFileChange={(file, response) => {
                                        if (response && (response.status === 'success' || response.path))
                                            setTempFiles((prev) => ({ ...prev, [doc.id]: response.path }));
                                        else if (file === null)
                                            setTempFiles((prev) => {
                                                const n = { ...prev };
                                                delete n[doc.id];
                                                return n;
                                            });
                                    }}
                                    disabled={verifyingDocId === doc.id}
                                />
                            ) : (
                                <div className="text-right text-xs text-gray-400 italic dark:text-zinc-500">
                                    {isPending ? trans.on_checking || 'On Checking' : trans.quota_exceeded || 'Quota Quota Exceeded'}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Notes Section (Full width bottom) */}
                {doc.url_path_file && (
                    <div className="mt-1 ml-5 flex flex-col items-start text-left text-xs">
                        {isRejected && (
                            <div className="mb-2 w-full rounded-md border border-red-100 bg-red-50 p-2 dark:border-red-900/30 dark:bg-red-900/20">
                                <div className="flex items-center gap-1 font-bold text-red-600 dark:text-red-400">
                                    <AlertTriangle className="h-3 w-3" /> {trans.rejection_note}
                                </div>
                                <p className="mt-1 text-gray-700 italic dark:text-zinc-300">"{doc.correction_description}"</p>
                                {doc.correction_attachment_file && (
                                    <a
                                        href={`/file/view/${doc.correction_attachment_file}`}
                                        target="_blank"
                                        className="mt-1 inline-block text-blue-500 underline dark:text-blue-400"
                                    >
                                        {trans.view_rejection_file}
                                    </a>
                                )}
                            </div>
                        )}
                        <div className="text-gray-500 dark:text-slate-700">
                            {trans.revision_quota}: <span className="font-bold text-gray-700 dark:text-zinc-800">{doc.kuota_revisi ?? 0}</span>{' '}
                            {trans.remaining}
                        </div>
                        {quotaExceeded && (
                            <div className="mt-0.5 text-[10px] font-bold text-red-600 uppercase dark:text-red-400">{trans.quota_exceeded}</div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const handleSaveGlobalDeadline = async () => {
        setIsSavingDeadline(true);
        try {
            await axios.post('/shipping/update-deadline', {
                spk_id: shipmentData.id_spk,
                unified: useUnifiedDeadline,
                global_deadline: useUnifiedDeadline ? globalDeadlineDate : null,
                section_deadlines: !useUnifiedDeadline ? sectionDeadlines : {},
            });
            toast.success('Deadline Global tersimpan!');
        } catch (error: any) {
            console.error('Error saving global deadline:', error);
            toast.error('Gagal menyimpan deadline global.');
        } finally {
            setIsSavingDeadline(false);
        }
    };

    const handleAssignStaff = () => {
        if (!selectedStaff) {
            toast.warning(trans.select_staff_placeholder || 'Please select a staff member');
            return;
        }

        setIsAssigningStaff(true);
        router.post(
            `/shipping/${shipmentData.id_spk}/assign-staff`,
            {
                assigned_pic: selectedStaff,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Staff assigned successfully');
                    setIsAssigningStaff(false);
                },
                onError: (errors: any) => {
                    const errorMessage = errors.assigned_pic || errors.error || 'Failed to assign staff';
                    toast.error(errorMessage);
                    console.error(errors);
                    setIsAssigningStaff(false);
                },
            },
        );
    };

    const handleToggleInternalCanUpload = async (value: boolean) => {
        setIsUpdatingUploadMode(true);
        try {
            const response = await axios.post('/shipping/update-internal-can-upload', {
                id_spk: shipmentData.id_spk,
                internal_can_upload: value,
            });
            if (response.data.success) {
                setInternalCanUpload(value);
                toast.success(value ? 'Mode: Staff Upload aktif' : 'Mode: Dual Upload aktif');
            } else {
                toast.error(response.data.message || 'Gagal mengubah upload mode');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Gagal mengubah upload mode');
        } finally {
            setIsUpdatingUploadMode(false);
        }
    };

    const handleOpenAddSectionModal = async () => {
        setIsAddSectionModalOpen(true);
        setSelectedSections([]);
        setSectionSearchQuery('');
        setIsLoadingSections(true);

        try {
            const response = await axios.get('/shipping/available-sections', {
                params: {
                    id_spk: shipmentData.id_spk,
                },
            });

            if (response.data.success) {
                setAvailableSections(response.data.sections || []);
            } else {
                toast.error(response.data.message || 'Failed to load sections');
            }
        } catch (error: any) {
            console.error('Error fetching sections:', error);
            toast.error(error.response?.data?.message || 'Failed to load sections');
        } finally {
            setIsLoadingSections(false);
        }
    };

    const handleSectionCheckboxChange = (sectionId: number, checked: boolean) => {
        if (checked) {
            setSelectedSections((prev) => [...prev, sectionId]);
        } else {
            setSelectedSections((prev) => prev.filter((id) => id !== sectionId));
        }
    };

    const handleSaveSelectedSections = async () => {
        if (selectedSections.length === 0) {
            toast.error('Please select at least one section');
            return;
        }

        setIsSavingSections(true);

        try {
            const response = await axios.post('/shipping/add-sections-to-spk', {
                id_spk: shipmentData.id_spk,
                section_ids: selectedSections,
            });

            if (response.data.success) {
                toast.success(response.data.message || 'Sections added successfully');
                setIsAddSectionModalOpen(false);
                setSelectedSections([]);

                router.reload({
                    only: ['sectionsTransProp'],
                });
            } else {
                toast.error(response.data.message || 'Failed to add sections');
            }
        } catch (error: any) {
            console.error('Error adding sections:', error);
            toast.error(error.response?.data?.message || 'Failed to add sections');
        } finally {
            setIsSavingSections(false);
        }
    };

    const handleSaveEtaDate = async () => {
        setIsSavingEtaDate(true);
        try {
            const response = await axios.post(`/shipping/${shipmentData.id_spk}/update-eta-date`, {
                eta_date: etaDate,
            });
            if (response.data.success) {
                toast.success('ETA Date berhasil diperbarui');
            } else {
                toast.error(response.data.message || 'Gagal memperbarui ETA Date');
            }
        } catch (error: any) {
            console.error('Error updating eta date:', error);
            toast.error(error.response?.data?.message || 'Gagal memperbarui ETA Date');
        } finally {
            setIsSavingEtaDate(false);
        }
    };

    const handleSaveJobDate = async () => {
        setIsSavingJobDate(true);
        try {
            const response = await axios.post(`/shipping/${shipmentData.id_spk}/update-job-date`, {
                job_date: jobDate,
            });
            if (response.data.success) {
                toast.success('Job Date berhasil diperbarui');
            } else {
                toast.error(response.data.message || 'Gagal memperbarui Job Date');
            }
        } catch (error: any) {
            console.error('Error updating job date:', error);
            toast.error(error.response?.data?.message || 'Gagal memperbarui Job Date');
        } finally {
            setIsSavingJobDate(false);
        }
    };

    const handleSaveInspectionDate = async () => {
        setIsSavingInspectionDate(true);
        try {
            const response = await axios.post(`/shipping/${shipmentData.id_spk}/update-inspection-date`, {
                inspection_date: inspectionDate,
            });
            if (response.data.success) {
                toast.success('Inspection Date berhasil diperbarui');
            } else {
                toast.error(response.data.message || 'Gagal memperbarui Inspection Date');
            }
        } catch (error: any) {
            console.error('Error updating inspection date:', error);
            toast.error(error.response?.data?.message || 'Gagal memperbarui Inspection Date');
        } finally {
            setIsSavingInspectionDate(false);
        }
    };

    // Calculate overall progress across all sections (memoized)
    const progressPercentage = useMemo(() => {
        let totalDocs = 0;
        let verifiedDocs = 0;

        processedSectionDocs.forEach((groups) => {
            totalDocs += groups.length;
            verifiedDocs += groups.filter((g) => g.current.verify === true).length;
        });

        return totalDocs === 0 ? 0 : Math.round((verifiedDocs / totalDocs) * 100);
    }, [processedSectionDocs]);

    return (
        <div className="animate-in fade-in mx-auto w-full max-w-7xl overflow-x-hidden bg-slate-50/30 p-4 font-sans text-sm text-slate-900 duration-500 sm:p-6 xl:p-8 dark:bg-zinc-950 dark:text-zinc-100">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
                {/* --- LEFT DESKTOP COLUMN --- */}
                <div className="flex w-full flex-col gap-6 lg:w-[35%] lg:shrink-0 xl:w-[30%]">
                    {/* --- SPK Header Card --- */}
                    <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] sm:p-6 dark:border-zinc-800/80 dark:bg-zinc-900/80">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{trans.status || 'Shipment Status'}</div>
                                <div className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    {shipmentData.status ? shipmentData.status.toUpperCase() : 'UNKNOWN'}
                                </div>
                            </div>
                            <div
                                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${progressPercentage === 100 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}
                            >
                                <span className="text-lg font-bold">{progressPercentage}%</span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                                <span>{trans.document_completion || 'Document Progress'}</span>
                                <span>{progressPercentage}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                                <div
                                    className={`h-full transition-all duration-1000 ease-out ${progressPercentage === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-medium text-slate-500 italic">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                            {trans.last_updated || 'Last updated'}: {shipmentData.spkDate}{' '}
                            {shipmentData.updated_by_name ? `by ${shipmentData.updated_by_name}` : ''}
                        </div>

                        {/* SUPERVISOR: Assign Staff */}
                        {isSupervisor && (
                            <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
                                {/* Assign Staff */}
                                <div>
                                    <Label className="mb-2 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">{trans.assign_staff}</Label>
                                    <div className="flex items-center gap-2">
                                        <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                                            <SelectTrigger className="h-9 flex-1 rounded-lg border-slate-200 text-xs focus:ring-blue-500/20">
                                                <SelectValue placeholder={trans.select_staff_placeholder || 'Select Staff'} />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                                                {internalStaff.length > 0 ? (
                                                    internalStaff.map((staff: any) => (
                                                        <SelectItem
                                                            key={staff.id_user}
                                                            value={String(staff.id_user)}
                                                            className="cursor-pointer text-xs hover:bg-blue-50 focus:bg-blue-50 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800"
                                                        >
                                                            {staff.name}
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <div className="p-2 text-center text-xs text-slate-500">{trans.data_not_found || 'No staff found'}</div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            onClick={handleAssignStaff}
                                            disabled={isAssigningStaff}
                                            className="h-9 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50"
                                            title={trans.assign || 'Assign'}
                                        >
                                            <Save className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Upload Mode Toggle */}
                                <div>
                                    <Label className="mb-2 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">{trans.upload_mode}</Label>
                                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
                                        <button
                                            onClick={() => !isUpdatingUploadMode && handleToggleInternalCanUpload(true)}
                                            disabled={isUpdatingUploadMode}
                                            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${internalCanUpload ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                                } disabled:opacity-50`}
                                        >
                                            {trans.staff_upload}
                                        </button>
                                        <button
                                            onClick={() => !isUpdatingUploadMode && handleToggleInternalCanUpload(false)}
                                            disabled={isUpdatingUploadMode}
                                            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${!internalCanUpload ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                                } disabled:opacity-50`}
                                        >
                                            {trans.dual_upload}
                                        </button>
                                    </div>
                                    <p className="mt-1.5 text-[10px] text-slate-400">
                                        {internalCanUpload ? trans.staff_upload_desc : trans.dual_upload_desc}
                                    </p>
                                </div>
                            </div>
                        )}
                        <div className="mt-5 space-y-1.5 border-t border-slate-200/60 pt-4 dark:border-zinc-800 pt-4 grid grid-cols-2 gap-x-1 gap-y-2">
                            {/* Shipment Type */}
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{trans.shipment_type}</div>
                                <div className="text-sm font-semibold text-slate-700 dark:text-zinc-300">{shipmentData.type}</div>
                            </div>

                            {/* Penjaluran */}
                            {shipmentData.penjaluran && (
                                <div className="space-y-1 text-right sm:text-left">
                                    <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{trans.channel}</div>
                                    <div>
                                        <span
                                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-tight uppercase ring-1 ring-inset ${shipmentData.penjaluran === 'merah'
                                                ? 'bg-rose-50 text-rose-700 ring-rose-600/20'
                                                : 'bg-green-50 text-green-700 ring-green-600/20'
                                                }`}
                                        >
                                            {trans[shipmentData.penjaluran] || shipmentData.penjaluran}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Registration No */}
                            {shipmentData.register_number && (
                                <div className="space-y-1">
                                    <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                        {trans.register_number || 'Nomor Pendaftaran'}
                                    </div>
                                    <div className="text-sm font-semibold text-slate-700 dark:text-zinc-300">{shipmentData.register_number}</div>
                                </div>
                            )}

                            {/* Registration Date */}
                            {shipmentData.register_date && (
                                <div className="space-y-1 text-right sm:text-left">
                                    <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                        {trans.register_date || 'Tanggal Pendaftaran'}
                                    </div>
                                    <div className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                                        {new Date(shipmentData.register_date).toLocaleDateString(`${trans.locale}`, {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="col-span-2 mt-2 space-y-2 border-t border-slate-200/60 pt-4 dark:border-zinc-800">
                                <div className="flex items-center justify-between">
                                    <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{trans.hs_code || 'HS Code'}</div>
                                    {shipmentData.hsCodes.length > 0 && (
                                        <button onClick={enableEditMode} className="text-xs font-semibold text-blue-500 hover:text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300">
                                            {trans.edit || 'Edit'}
                                        </button>
                                    )}
                                </div>
                                <div className="flex w-full flex-col">
                                    <div className="flex flex-col">
                                        {shipmentData.hsCodes.length > 0 ? (
                                            shipmentData.hsCodes.map((item: any, index: number) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <span>{item.code}</span>
                                                    {item.link ? (
                                                        <a
                                                            href={`/file/view/${item.link}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-bold text-blue-600 hover:underline dark:text-blue-400"
                                                        >
                                                            [INSW]
                                                        </a>
                                                    ) : (
                                                        <span className="cursor-not-allowed font-bold text-gray-400">
                                                            [INSW]
                                                        </span>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400 italic">-</span>
                                                <button onClick={enableEditMode} className="text-xs text-blue-500 hover:underline dark:text-blue-400">
                                                    + {trans.add_another_hs}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ETA Date Field */}
                            <div className="col-span-2 mt-2 space-y-1.5 border-t border-slate-200/60 pt-3 dark:border-zinc-800">
                                <div className="flex items-center justify-between">
                                    <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{trans.eta_date}</div>
                                    {isSavingEtaDate && (
                                        <div className="flex items-center gap-1.5 text-[9px] font-medium text-blue-500 animate-pulse">
                                            <div className="h-1 w-1 rounded-full bg-blue-500"></div>
                                            Saving...
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="date"
                                        value={etaDate}
                                        onChange={(e) => setEtaDate(e.target.value)}
                                        className="date-input-dark h-9 rounded-lg border-slate-200 bg-white text-xs text-slate-700 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                                        disabled={!isInternalUser || isSavingEtaDate}
                                    />
                                </div>
                            </div>
                            {/* Job date field */}
                            {sectionsTransProp?.some((s) => s.id_section === 7) && (
                                <div className="col-span-2 mt-2 space-y-1.5 border-t border-slate-200/60 pt-3 dark:border-zinc-800">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{trans.job_date || 'Job Date'}</div>
                                        {isSavingJobDate && (
                                            <div className="flex items-center gap-1.5 text-[9px] font-medium text-blue-500 animate-pulse">
                                                <div className="h-1 w-1 rounded-full bg-blue-500"></div>
                                                Saving...
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="date"
                                            value={jobDate}
                                            onChange={(e) => setJobDate(e.target.value)}
                                            className="date-input-dark h-9 rounded-lg border-slate-200 bg-white text-xs text-slate-700 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                                            disabled={!isInternalUser || isSavingJobDate}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* inspection date field */}
                            {sectionsTransProp?.some((s) => s.id_section === 7) && (
                                <div className="col-span-2 mt-2 space-y-1.5 border-t border-slate-200/60 pt-3 dark:border-zinc-800">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{trans.inspection_date || 'Inspection Date'}</div>
                                        {isSavingInspectionDate && (
                                            <div className="flex items-center gap-1.5 text-[9px] font-medium text-blue-500 animate-pulse">
                                                <div className="h-1 w-1 rounded-full bg-blue-500"></div>
                                                Saving...
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="date"
                                            value={inspectionDate}
                                            onChange={(e) => setInspectionDate(e.target.value)}
                                            className="date-input-dark h-9 rounded-lg border-slate-200 bg-white text-xs text-slate-700 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                                            disabled={!isInternalUser || isSavingInspectionDate}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* NPD Checkbox Section */}
                            {isInternalUser && (
                                <div className="col-span-2 mt-2 space-y-1.5 border-t border-slate-200/60 pt-3 dark:border-zinc-800">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="is-npd"
                                            checked={isNpd}
                                            onCheckedChange={handleNpdChange}
                                            disabled={!isInternalUser || isUpdatingNpd}
                                            className="border-slate-300 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 dark:border-zinc-700"
                                        />
                                        <Label htmlFor="is-npd" className="cursor-pointer text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-zinc-400">
                                            {trans.need_npd || 'Apakah SPK Ini Membutuhkan NPD?'}
                                        </Label>
                                    </div>
                                    {isNpd && npdDate && (
                                        <div className="mt-1 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                                            NPD Date: {new Date(npdDate).toLocaleDateString(`${trans.locale || 'id-ID'}`, {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Ori Date Button */}
                            {isInternalUser && (
                                <div className="col-span-2 mt-2 border-t border-slate-200/60 pt-3 dark:border-zinc-800">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={openOriDateModal}
                                        className="h-9 w-full gap-2 rounded-lg border-dashed border-slate-300 text-[10px] font-bold tracking-wider text-slate-500 uppercase hover:border-blue-400 hover:text-blue-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                        {trans.add_ori_date || 'Tambah ORI Date'}
                                    </Button>
                                </div>
                            )}
                        </div>
                        {isInternalUser && (
                            <div className="flex items-center justify-center mt-2">
                                <Button onClick={() => setOpenEmailModal(true)}>
                                    Kirim Email Pemberitahuan
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Ori Date Modal */}
                    <Dialog open={isOriDateModalOpen} onOpenChange={setIsOriDateModalOpen}>
                        <DialogContent className="max-w-2xl rounded-2xl p-0 dark:border-zinc-800 dark:bg-zinc-900">
                            <DialogHeader className="border-b px-6 py-4 dark:border-zinc-800">
                                <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
                                    {trans.manage_ori_date || 'Kelola Tanggal ORI Dokumen'}
                                </DialogTitle>
                            </DialogHeader>

                            {/* Bulk Apply Section */}
                            {allDocumentsForOriDate.length > 0 && (
                                <div className="border-b border-slate-200/60 bg-slate-50/80 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                                    <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">
                                        {trans.bulk_apply_ori_date || 'Terapkan Tanggal Sekaligus'}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Input
                                            type="date"
                                            value={bulkOriDate}
                                            onChange={(e) => setBulkOriDate(e.target.value)}
                                            className="date-input-dark h-9 w-44 rounded-lg border-slate-200 bg-white text-xs text-slate-700 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => applyBulkOriDate('all')}
                                            disabled={!bulkOriDate}
                                            className="h-9 rounded-lg text-[10px] font-bold uppercase tracking-wide dark:border-zinc-700 dark:text-zinc-300"
                                        >
                                            {trans.apply_to_all || 'Terapkan Semua'}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => applyBulkOriDate('selected')}
                                            disabled={!bulkOriDate || selectedOriDocIds.length === 0}
                                            className="h-9 rounded-lg text-[10px] font-bold uppercase tracking-wide dark:border-zinc-700 dark:text-zinc-300"
                                        >
                                            {trans.apply_to_selected || 'Terapkan Terpilih'}
                                            {selectedOriDocIds.length > 0 && (
                                                <span className="ml-1 rounded-full bg-blue-500 px-1.5 py-0.5 text-[9px] text-white">
                                                    {selectedOriDocIds.length}
                                                </span>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="max-h-[55vh] space-y-2 overflow-y-auto px-6 py-4">
                                {allDocumentsForOriDate.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-slate-400 dark:text-zinc-500">
                                        {trans.no_documents || 'Tidak ada dokumen'}
                                    </div>
                                ) : (
                                    <>
                                        {/* Select All Checkbox */}
                                        <div className="flex items-center gap-2 rounded-lg bg-slate-100/50 px-3 py-2 dark:bg-zinc-900/50">
                                            <Checkbox
                                                id="select-all-ori"
                                                checked={selectedOriDocIds.length === allDocumentsForOriDate.length && allDocumentsForOriDate.length > 0}
                                                onCheckedChange={toggleSelectAllOriDocs}
                                            />
                                            <label htmlFor="select-all-ori" className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                {trans.select_all || 'Pilih Semua'} ({selectedOriDocIds.length}/{allDocumentsForOriDate.length})
                                            </label>
                                        </div>

                                        {allDocumentsForOriDate.map((doc) => (
                                            <div
                                                key={doc.id}
                                                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${selectedOriDocIds.includes(doc.id)
                                                    ? 'border-blue-300 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20'
                                                    : 'border-slate-200/60 bg-slate-50/50 dark:border-zinc-800 dark:bg-zinc-950/50'
                                                    }`}
                                            >
                                                <Checkbox
                                                    id={`ori-doc-${doc.id}`}
                                                    checked={selectedOriDocIds.includes(doc.id)}
                                                    onCheckedChange={() => toggleOriDocSelection(doc.id)}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate text-sm font-semibold text-slate-700 dark:text-zinc-200">
                                                        {doc.master_document?.nama_dokumen || doc.nama_file}
                                                    </div>
                                                    <div className="mt-0.5 text-[10px] font-medium tracking-wide text-slate-400 uppercase dark:text-zinc-500">
                                                        {doc.sectionName}
                                                    </div>
                                                </div>
                                                <Input
                                                    type="date"
                                                    value={oriDateValues[doc.id] || ''}
                                                    onChange={(e) =>
                                                        setOriDateValues((prev) => ({
                                                            ...prev,
                                                            [doc.id]: e.target.value,
                                                        }))
                                                    }
                                                    className="date-input-dark h-9 w-44 shrink-0 rounded-lg border-slate-200 bg-white text-xs text-slate-700 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                                                />
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>

                            <DialogFooter className="border-t px-6 py-4 dark:border-zinc-800">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsOriDateModalOpen(false)}
                                    className="rounded-lg dark:border-zinc-700 dark:text-zinc-300"
                                >
                                    {trans.cancel || 'Batal'}
                                </Button>
                                <Button
                                    onClick={handleSaveOriDates}
                                    disabled={isSavingOriDates}
                                    className="rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
                                >
                                    {isSavingOriDates ? '...' : trans.save || 'Simpan'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* NPD Modal */}
                    <Dialog open={isNpdModalOpen} onOpenChange={(val) => {
                        if (!val && !isUpdatingNpd) {
                            setIsNpdModalOpen(false);
                            if (!shipmentDataProp?.is_npd) {
                                setIsNpd(false);
                            }
                        }
                    }}>
                        <DialogContent className="max-w-85 rounded-xl p-0 sm:max-w-100">
                            <DialogHeader className="px-4 py-3">
                                <DialogTitle className="text-left text-lg font-bold">{trans.npd_setup || 'Pengaturan NPD'}</DialogTitle>
                            </DialogHeader>

                            <div className="max-h-75 overflow-y-auto px-4 py-2">
                                {isLoadingNpd ? (
                                    <div className="py-8 text-center text-sm text-gray-500">{trans.loading_docs || 'Loading...'}</div>
                                ) : (
                                    <div className="space-y-6 pb-4">
                                        <div className="space-y-1.5">
                                            <Label className="font-semibold text-slate-700 dark:text-zinc-300">
                                                {trans.npd_date || 'Tanggal NPD'} <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                type="date"
                                                value={npdDate}
                                                onChange={(e) => setNpdDate(e.target.value)}
                                                className="date-input-dark h-9 rounded-lg border-slate-200 bg-white text-xs text-slate-700 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                                            />
                                        </div>

                                        {npdMandatoryDocs.length > 0 && (
                                            <div className="space-y-3">
                                                <Label className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                                                    {trans.mandatory_npd_docs || 'Dokumen Wajib NPD'}
                                                </Label>
                                                <div className="flex flex-col gap-3">
                                                    {npdMandatoryDocs.map((doc) => (
                                                        <div key={doc.id_dokumen} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-gray-200 bg-slate-50/50 p-3 dark:border-zinc-700 dark:bg-zinc-800/30">
                                                            <div className="flex-1 mb-2 sm:mb-0">
                                                                <div className="text-sm font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 hidden sm:block" />
                                                                    {doc.nama_file}
                                                                </div>
                                                            </div>
                                                            <div className="w-full sm:w-[220px]">
                                                                <ResettableDropzone
                                                                    label=""
                                                                    isRequired={false}
                                                                    className="h-10 border-dashed border-gray-400 bg-white"
                                                                    existingFile={
                                                                        npdTempFiles[doc.id_dokumen]
                                                                            ? { nama_file: doc.nama_file, path: npdTempFiles[doc.id_dokumen] }
                                                                            : undefined
                                                                    }
                                                                    uploadConfig={{
                                                                        url: '/shipping/upload-temp',
                                                                        payload: { type: doc.nama_file, spk_code: shipmentData.spkNumber },
                                                                    }}
                                                                    onFileChange={(file, response) => {
                                                                        if (response && (response.status === 'success' || response.path))
                                                                            setNpdTempFiles((prev) => ({ ...prev, [doc.id_dokumen]: response.path }));
                                                                        else if (file === null)
                                                                            setNpdTempFiles((prev) => {
                                                                                const n = { ...prev };
                                                                                delete n[doc.id_dokumen];
                                                                                return n;
                                                                            });
                                                                    }}
                                                                    disabled={isUpdatingNpd}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {npdAdditionalDocs.length > 0 && (
                                            <div className="space-y-3">
                                                <Label className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                                                    {trans.additional_npd_docs || 'Dokumen Tambahan'}
                                                </Label>
                                                <div className="space-y-4">
                                                    {npdAdditionalDocs.map((doc) => (
                                                        <div key={doc.id_dokumen} className="flex items-center space-x-3">
                                                            <Checkbox
                                                                id={`npd-doc-${doc.id_dokumen}`}
                                                                checked={npdSelectedAdditionalDocs.includes(doc.id_dokumen)}
                                                                onCheckedChange={(checked) => {
                                                                    setNpdSelectedAdditionalDocs((prev) =>
                                                                        checked
                                                                            ? [...prev, doc.id_dokumen]
                                                                            : prev.filter((id) => id !== doc.id_dokumen)
                                                                    );
                                                                }}
                                                                disabled={isUpdatingNpd}
                                                                className="h-5 w-5 rounded border-2 border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:border-zinc-500 dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black"
                                                            />
                                                            <label
                                                                htmlFor={`npd-doc-${doc.id_dokumen}`}
                                                                className="cursor-pointer text-base leading-none font-normal peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-zinc-200"
                                                            >
                                                                {doc.nama_file}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col items-center gap-3 border-t p-4 pt-2">
                                {(npdSelectedAdditionalDocs.length > 0 || Object.keys(npdTempFiles).length > 0) && (
                                    <div className="text-sm text-gray-600 dark:text-zinc-400">
                                        {npdSelectedAdditionalDocs.length} additional document(s) selected
                                    </div>
                                )}
                                <Button
                                    className="h-10 w-full rounded-md bg-black text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50"
                                    onClick={handleSaveNpdModal}
                                    disabled={isUpdatingNpd || isLoadingNpd}
                                >
                                    {isUpdatingNpd ? 'Saving...' : trans.save_changes || 'Save Changes'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Modal Dialog for Edit HS Codes */}
                    <Dialog open={isEditingHsCodes} onOpenChange={(open) => !open && cancelEditMode()}>
                        <DialogContent className="max-w-md rounded-2xl p-0 dark:border-zinc-800 dark:bg-zinc-900">
                            <DialogHeader className="border-b px-6 py-4 dark:border-zinc-800">
                                <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">{trans.edit_hs_data}</DialogTitle>
                            </DialogHeader>

                            <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-4">
                                <div className="flex flex-col gap-4">
                                    {hsCodes.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className="relative rounded-lg border border-gray-200 bg-slate-50 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                                        >
                                            {/* TOMBOL DELETE ITEM */}
                                            {hsCodes.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeHsCodeField(item.id)}
                                                    className="absolute top-3 right-3 text-red-500 transition-colors hover:text-red-700"
                                                    title={trans.delete_hs || 'Hapus HS Code'}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}

                                            <div className="grid gap-3 pt-1">
                                                {/* Input HS Code */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs font-semibold dark:text-zinc-400">{trans.input_hs_code}</Label>
                                                    <Input
                                                        className="h-9 rounded-md border-slate-300 text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                                                        placeholder={trans.input_hs_code}
                                                        value={item.code}
                                                        onChange={(e) => updateHsCode(item.id, 'code', e.target.value)}
                                                    />
                                                </div>

                                                {/* File Upload */}
                                                <div className="space-y-2">
                                                    <ResettableDropzoneImage
                                                        label={trans.insw_link_ref}
                                                        isRequired={false}
                                                        existingFile={
                                                            !item.file && item.link
                                                                ? {
                                                                    nama_file: item.link,
                                                                    path: `/file/view/${item.link}`,
                                                                }
                                                                : undefined
                                                        }
                                                        onFileChange={(file) => {
                                                            updateHsCode(item.id, 'file', file);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Tombol Tambah Item Baru */}
                                    <Button variant="outline" onClick={addHsCodeField} className="w-full border-dashed border-slate-300 dark:border-zinc-700">
                                        <Plus className="mr-2 h-4 w-4" /> {trans.add_another_hs}
                                    </Button>
                                </div>
                            </div>

                            <DialogFooter className="flex gap-2 rounded-b-2xl border-t bg-slate-50/50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/80">
                                <Button
                                    onClick={cancelEditMode}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    {trans.cancel}
                                </Button>
                                <Button onClick={handleSaveEdit} disabled={isProcessingHsCodesEdit} className="flex-1 bg-black text-white hover:bg-gray-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300">
                                    {isProcessingHsCodesEdit ? 'Saving...' : trans.save_changes}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* --- Formulir Penerimaan Dokumen --- */}
                    {isInternalUser && (
                        <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl sm:p-6 dark:border-zinc-800/80 dark:bg-zinc-900/80">
                            <div className="mb-5 text-xs font-bold tracking-wider text-slate-500 uppercase">{trans.document_receipt_form || 'Formulir Penerimaan Dokumen'}</div>
                            <div className="flex flex-col gap-4">
                                {/* Shipper */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Shipper</Label>
                                    <MemoizedInput
                                        placeholder="Input Shipper"
                                        value={shipperForm}
                                        onValueChange={(val) => setShipperForm(val)}
                                        className="h-9 rounded-lg border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900"
                                    />
                                </div>
                                {/* Consignee */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Consignee (C'NEE)</Label>
                                    <MemoizedInput
                                        placeholder="Input Consignee"
                                        value={consigneeForm}
                                        disabled
                                        onValueChange={(val) => setConsigneeForm(val)}
                                        className="h-9 rounded-lg border-slate-300 bg-slate-100 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-slate-50"
                                    />
                                </div>
                                {/* B/L NUM / S/I NUM / SPK NUM */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                        {shipmentDataProp?.type === 'Export' ? 'S/I NUM' : shipmentDataProp?.type === 'Import' ? 'B/L NUM' : 'SPK NUM'}
                                    </Label>
                                    <MemoizedInput
                                        placeholder="Input B/L / S/I NUM"
                                        value={blNumForm}
                                        onValueChange={(val) => setBlNumForm(val)}
                                        disabled
                                        className="h-9 rounded-lg border-slate-300 bg-slate-100 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-slate-50"
                                    />
                                </div>
                                {/* Vessel */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{trans.vessel}</Label>
                                    <MemoizedInput
                                        placeholder="Input Vessel"
                                        value={vesselForm}
                                        onValueChange={(val) => setVesselForm(val)}
                                        className="h-9 rounded-lg border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900"
                                    />
                                </div>
                                {/* Origin */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{trans.origin}</Label>
                                    <MemoizedInput
                                        placeholder="Input Origin"
                                        value={originForm}
                                        onValueChange={(val) => setOriginForm(val)}
                                        className="h-9 rounded-lg border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900"
                                    />
                                </div>
                                {/* Port Of Loading */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{trans.port_of_loading || 'Port Of Loading'}</Label>
                                    <MemoizedInput
                                        placeholder="Input Port Of Loading"
                                        value={portOfLoadingForm}
                                        onValueChange={(val) => setPortOfLoadingForm(val)}
                                        className="h-9 rounded-lg border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900"
                                    />
                                </div>
                                {/* Port Of Discharge (Previously Port) */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{trans.port}</Label>
                                    <MemoizedInput
                                        placeholder="Input Port Of Discharge"
                                        value={portForm}
                                        onValueChange={(val) => setPortForm(val)}
                                        className="h-9 rounded-lg border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900"
                                    />
                                </div>
                                {/* Comodity */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{trans.comodity}</Label>
                                    <MemoizedInput
                                        placeholder="Input Comodity"
                                        value={comodityForm}
                                        onValueChange={(val) => setComodityForm(val)}
                                        className="h-9 rounded-lg border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900"
                                    />
                                </div>
                                {/* Party Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Party List</Label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setParties([...parties, { party_type: 'FCL', party_category: '1 - GENERAL / DRY CARGO', party_qty: '', party_size: '20 ft' }])}
                                            className="h-6 px-2 text-[10px] font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                        >
                                            <Plus className="mr-1 h-3 w-3" /> Add Party
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        {parties.map((party, index) => (
                                            <div key={index} className="relative space-y-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3 transition-colors hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-950/30">
                                                {parties.length > 1 && (
                                                    <button
                                                        onClick={() => setParties(parties.filter((_, i) => i !== index))}
                                                        className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-sm transition-transform hover:scale-110 dark:bg-rose-900/40"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                )}

                                                <div className="grid grid-cols-2 gap-2">
                                                    {/* Type FCL/LCL */}
                                                    <div className="space-y-1">
                                                        <Label className="text-[9px] font-bold text-slate-400 uppercase">Type</Label>
                                                        <Select
                                                            value={party.party_type}
                                                            onValueChange={(val) => {
                                                                const newParties = [...parties];
                                                                newParties[index].party_type = val;
                                                                if (val === 'LCL') {
                                                                    newParties[index].party_category = null;
                                                                    newParties[index].party_size = 'CBM';
                                                                } else {
                                                                    newParties[index].party_category = '1 - GENERAL / DRY CARGO';
                                                                    newParties[index].party_size = '20 ft';
                                                                }
                                                                setParties(newParties);
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8 rounded-lg border-slate-300 text-[10px] focus:ring-blue-500/20 dark:border-zinc-700">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="dark:bg-zinc-900">
                                                                <SelectItem value="FCL" className="text-xs">FCL</SelectItem>
                                                                <SelectItem value="LCL" className="text-xs">LCL</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* Size */}
                                                    <div className="space-y-1">
                                                        <Label className="text-[9px] font-bold text-slate-400 uppercase">Size/Unit</Label>
                                                        <Select
                                                            value={party.party_size}
                                                            onValueChange={(val) => {
                                                                const newParties = [...parties];
                                                                newParties[index].party_size = val;
                                                                setParties(newParties);
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8 rounded-lg border-slate-300 text-[10px] focus:ring-blue-500/20 dark:border-zinc-700">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="dark:bg-zinc-900">
                                                                {party.party_type === 'FCL' ? (
                                                                    ['20 ft', '40 ft', '45 ft', '60 ft'].map(s => (
                                                                        <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                                                                    ))
                                                                ) : (
                                                                    ['CBM', 'KG'].map(s => (
                                                                        <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                                                                    ))
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                {/* Category (Only for FCL) */}
                                                {party.party_type === 'FCL' && (
                                                    <div className="space-y-1">
                                                        <Label className="text-[9px] font-bold text-slate-400 uppercase">Category (FCL)</Label>
                                                        <Select
                                                            value={party.party_category}
                                                            onValueChange={(val) => {
                                                                const newParties = [...parties];
                                                                newParties[index].party_category = val;
                                                                setParties(newParties);
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8 w-full rounded-lg border-slate-300 text-[10px] focus:ring-blue-500/20 dark:border-zinc-700">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="dark:bg-zinc-900">
                                                                {[
                                                                    "1 - GENERAL / DRY CARGO",
                                                                    "2 - TUNNE TYPE",
                                                                    "3 - OPEN TOP STEEL",
                                                                    "4 - FLAT RACK",
                                                                    "5 - REEFER/REFREGETE",
                                                                    "6 - BARGE CONTAINER",
                                                                    "7 - BULK CONTAINER",
                                                                    "8 - ISOTANK"
                                                                ].map(cat => (
                                                                    <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}

                                                {/* Quantity */}
                                                <div className="space-y-1">
                                                    <Label className="text-[9px] font-bold text-slate-400 uppercase">{party.party_type === 'FCL' ? 'Party' : 'Quantity'}</Label>
                                                    <MemoizedInput
                                                        placeholder="Size"
                                                        value={party.party_qty}
                                                        onValueChange={(val) => {
                                                            const newParties = [...parties];
                                                            newParties[index].party_qty = val;
                                                            setParties(newParties);
                                                        }}
                                                        className="h-8 w-full rounded-lg border-slate-300 text-[10px] focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* AJU */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">AJU</Label>
                                    <MemoizedInput
                                        placeholder="Input AJU"
                                        value={ajuForm}
                                        onValueChange={(val) => setAjuForm(val)}
                                        className="h-9 rounded-lg border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900"
                                    />
                                </div>
                                {/* J.O */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">J.O</Label>
                                    <MemoizedInput
                                        placeholder="Input J.O"
                                        value={joForm}
                                        onValueChange={(val) => setJoForm(val)}
                                        className="h-9 rounded-lg border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* --- RIGHT DESKTOP COLUMN --- */}
                <div className="flex w-full flex-1 flex-col gap-6">

                    {/* NEW: Global Deadline Section - ONLY for Internal Users */}
                    {isSupervisor && (
                        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:mb-5 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="flex flex-col gap-3">
                                {/* Garis Kuning: Global Deadline Field */}
                                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
                                    <label className="text-sm font-semibold whitespace-nowrap text-slate-700 dark:text-zinc-300">{trans.set_deadline}:</label>
                                    <Input
                                        type="date"
                                        className={`date-input-dark h-9 flex-1 rounded-lg border-slate-300 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${!useUnifiedDeadline ? 'cursor-not-allowed bg-slate-100 opacity-50 dark:bg-zinc-800' : 'bg-white dark:bg-zinc-950'
                                            } dark:border-zinc-800 dark:text-white`}
                                        value={globalDeadlineDate}
                                        onChange={(e) => setGlobalDeadlineDate(e.target.value)}
                                        disabled={!useUnifiedDeadline}
                                    />
                                </div>

                                {/* Garis Hijau: Checkbox Apply to All */}
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="unified_deadline"
                                        className="h-4 w-4 rounded border-2 border-gray-400 data-[state=checked]:bg-black data-[state=checked]:text-white"
                                        checked={useUnifiedDeadline}
                                        onCheckedChange={(checked) => {
                                            const isUnified = checked === true;
                                            setUseUnifiedDeadline(isUnified);
                                            // When switching to per-section mode, pre-populate all sections with the global date
                                            // so inputs are not blank and user can individually adjust from there
                                            if (!isUnified && globalDeadlineDate) {
                                                const prefilled: Record<number, string> = {};
                                                sectionsTransProp.forEach((s: SectionTrans) => {
                                                    prefilled[s.id] = sectionDeadlines[s.id] || globalDeadlineDate;
                                                });
                                                setSectionDeadlines(prefilled);
                                            }
                                        }}
                                    />
                                    <label htmlFor="unified_deadline" className="cursor-pointer text-sm text-gray-600">
                                        {trans.apply_deadline_all}
                                    </label>
                                </div>

                                {/* Button Save Global Deadline */}
                                <div className="mt-2 flex justify-end">
                                    <Button
                                        onClick={handleSaveGlobalDeadline}
                                        disabled={isSavingDeadline}
                                        className="h-8 rounded bg-black px-4 text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-50"
                                    >
                                        <Save className="mr-2 h-3 w-3" />
                                        {isSavingDeadline ? 'Saving...' : trans.save_changes || 'Save Settings'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="w-full space-y-3">
                        {sectionsTransProp && sectionsTransProp.length > 0 ? (
                            sectionsTransProp
                                // --- LOGIC TAMBAHAN: FILTER SECTION ---
                                // Kita filter dulu supaya 'Additional Document' TIDAK MUNCUL di sini
                                .filter((section: any) => {
                                    const name = section.section_name.toLowerCase();
                                    // Kembalikan true jika namanya TIDAK mengandung kata 'additional' atau 'tambahan'
                                    return !name.includes('additional') && !name.includes('tambahan');
                                })
                                // ---------------------------------------
                                .map((section: any) => {
                                    const isOpen = activeSection === section.id; // Gunakan ID transaksi

                                    // --- Status Logic ---
                                    // --- Status Logic ---
                                    // FIX: Use latest documents only for status calculation
                                    // This prevents 'Rejected' status from persisting if a new version exists (which is Pending or Verified)
                                    const latestDocsGroups = processedSectionDocs.get(section.id) || [];
                                    const latestDocs = latestDocsGroups.map((g) => g.current);

                                    const validDocs = latestDocs.filter((d: any) => d.verify === true); // Verified (Latest only)

                                    // Fix: verify defaults to false, so ONLY check correction_attachment for Rejection
                                    const hasRejection = latestDocs.some((d: any) => d.correction_attachment);

                                    const allVerified = latestDocs.length > 0 && latestDocs.every((d: any) => d.verify === true);

                                    // Pending: Uploaded (url_path_file exists) but not Verified (verified IS NOT TRUE) AND not Rejected
                                    const hasPending = latestDocs.some((d: any) => d.url_path_file && d.verify !== true && !d.correction_attachment);

                                    // --- Styling Variables ---
                                    let containerClass = 'rounded-xl border transition-all duration-200 bg-white ';
                                    let headerClass = 'transition-all duration-200 ';
                                    let titleClass = 'text-sm tracking-tight transition-colors ';
                                    let chevronClass = 'h-4 w-4 transition-colors ';
                                    let deadlineIconClass = 'text-lg font-bold transition-colors ';
                                    let deadlineTextClass = 'text-xs font-bold transition-colors ';

                                    if (hasRejection) {
                                        // ROSE (Rejected) - Soft left-border accent + Header Highlight
                                        containerClass += 'bg-rose-50 border-l-4 border-rose-500 border-slate-200';
                                        headerClass += 'bg-rose-100 hover:bg-rose-200';
                                        titleClass += 'text-rose-900 font-bold';
                                        chevronClass += 'text-rose-700';
                                        deadlineIconClass += 'text-rose-700';
                                        deadlineTextClass += 'text-rose-700';
                                    } else if (allVerified) {
                                        // EMERALD (Verified) - Soft left-border accent + Header Highlight
                                        containerClass += 'bg-emerald-50 border-l-4 border-emerald-500 border-slate-200';
                                        headerClass += 'bg-emerald-100 hover:bg-emerald-200';
                                        titleClass += 'text-emerald-900 font-bold';
                                        chevronClass += 'text-emerald-700';
                                        deadlineIconClass += 'text-emerald-700';
                                        deadlineTextClass += 'text-emerald-700';
                                    } else if (hasPending) {
                                        // AMBER (Pending) - Soft left-border accent + Header Highlight
                                        containerClass += 'bg-amber-50 border-l-4 border-amber-500 border-slate-200';
                                        headerClass += 'bg-amber-100/50 hover:bg-amber-200/50';
                                        titleClass += 'text-amber-900 font-bold';
                                        chevronClass += 'text-amber-700';
                                        deadlineIconClass += 'text-amber-700';
                                        deadlineTextClass += 'text-amber-700';
                                    } else {
                                        // DEFAULT (Idle/None) - Clean white
                                        containerClass += 'border-slate-200 hover:border-slate-300 hover:shadow-sm';
                                        headerClass += 'hover:bg-slate-50';
                                        titleClass += 'text-slate-900 font-semibold';
                                        chevronClass += 'text-slate-500';
                                        deadlineIconClass += 'text-rose-500';
                                        deadlineTextClass += 'text-rose-500';
                                    }

                                    return (
                                        <div key={section.id_section} className={containerClass}>
                                            <div
                                                className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-t-xl px-2 py-2.5 sm:rounded-t-[0.65rem] sm:px-3 sm:py-3 ${headerClass}`}
                                                onClick={() => handleEditSection(section.id)}
                                            >
                                                {isOpen ? <ChevronUp className={chevronClass} /> : <ChevronDown className={chevronClass} />}
                                                <div className="flex flex-1 flex-col">
                                                    <span className={titleClass}>{section.section_name}</span>
                                                    {!isInternalUser && section.deadline && section.deadline_date && (
                                                        <div className="mt-1 flex items-center gap-1">
                                                            <span className={deadlineIconClass}>ⓘ</span>
                                                            <span className={deadlineTextClass}>
                                                                {trans.submit_before}{' '}
                                                                {new Date(section.deadline_date).toLocaleDateString(
                                                                    currentLocale === 'id' ? 'id-ID' : 'en-GB',
                                                                    {
                                                                        day: '2-digit',
                                                                        month: '2-digit',
                                                                        year: 'numeric',
                                                                    },
                                                                )}{' '}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                {isSupervisor && section.id_section > 6 && !isNpdSection(section) && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveSection(section);
                                                        }}
                                                        className="ml-2 rounded-lg p-1.5 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                                                        title={trans.remove_section || 'Hapus Section'}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>

                                            {isOpen && (
                                                <div className="animate-in fade-in slide-in-from-top-2 mt-1 rounded-xl border-t border-slate-100 bg-white px-4 pt-3 pb-5 shadow-sm duration-300">
                                                    {isSupervisor && (
                                                        <div className="mb-4 flex items-center gap-3">
                                                            <label className="text-sm font-semibold whitespace-nowrap text-slate-700 dark:text-slate-900">
                                                                {trans.deadline}:
                                                            </label>
                                                            <Input
                                                                type="date"
                                                                className={`date-input-light h-9 flex-1 rounded-lg border-slate-300 text-sm transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${useUnifiedDeadline
                                                                    ? 'cursor-not-allowed bg-slate-50 text-slate-900 opacity-50'
                                                                    : 'bg-white text-slate-900'
                                                                    } dark:border-zinc-700`}
                                                                value={useUnifiedDeadline ? globalDeadlineDate : sectionDeadlines[section.id] || ''}
                                                                onChange={(e) => {
                                                                    if (!useUnifiedDeadline) {
                                                                        setSectionDeadlines((prev) => ({
                                                                            ...prev,
                                                                            [section.id]: e.target.value,
                                                                        }));
                                                                    }
                                                                }}
                                                                disabled={useUnifiedDeadline}
                                                            />
                                                        </div>
                                                    )}

                                                    <div className="space-y-4">
                                                        {section.documents && section.documents.length > 0 ? (
                                                            (processedSectionDocs.get(section.id) || []).map((item, idx: number) => {
                                                                const doc = item.current;
                                                                const allVersions = [doc, ...item.history];
                                                                return renderDocumentRow(
                                                                    doc,
                                                                    idx,
                                                                    section.id,
                                                                    allVersions.filter((v) => !!v.url_path_file).length > 1,
                                                                    allVersions,
                                                                );
                                                            })
                                                        ) : (
                                                            <div className="py-4 text-center text-xs text-gray-400 italic">{trans.section_empty}</div>
                                                        )}
                                                    </div>

                                                    <div
                                                        className={`mt-4 flex flex-col items-stretch gap-3 sm:mt-8 sm:flex-row sm:items-center sm:gap-0 ${isInternalUser ? 'sm:justify-between' : 'sm:justify-end'}`}
                                                    >
                                                        {isInternalUser && (
                                                            <button
                                                                onClick={() => handleOpenModal(section.id_section)}
                                                                className="flex items-center gap-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:text-slate-900"
                                                            >
                                                                <div className="rounded border-2 border-slate-400 p-0.5 transition-colors duration-200 hover:border-slate-600">
                                                                    <Plus className="h-4 w-4" />
                                                                </div>
                                                                {trans.add_document}
                                                            </button>
                                                        )}

                                                        <Button
                                                            onClick={() => handleSaveSection(section.id)}
                                                            disabled={processingSectionId === section.id}
                                                            className="h-9 rounded-lg bg-blue-600 px-8 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            {processingSectionId === section.id ? trans.saving || 'Saving...' : trans.save_changes}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                        ) : (
                            <div className="py-4 text-center text-gray-500">
                                <p>{trans.loading_docs}</p>
                                <p className="text-xs text-gray-400">{trans.ensure_spk}</p>
                            </div>
                        )}
                    </div>

                    {isInternalUser && (
                        <div className="mt-4 flex justify-center">
                            <Button
                                onClick={handleOpenAddSectionModal}
                                className="w-full rounded-lg bg-black px-6 py-2 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-slate-900 dark:hover:bg-gray-200"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                {trans.add_section || 'Add Section'}
                            </Button>
                        </div>
                    )}

                    {/* Penjaluran Buttons */}
                    {(() => {
                        // Cek apakah semua dokumen di id_section === 4 sudah verified
                        const section4 = sectionsTransProp?.find((s: any) => s.id_section === 4);
                        const section4AllVerified = (() => {
                            if (!section4) return false;
                            const docs = processedSectionDocs.get(section4.id) || [];
                            const latestDocs = docs.map((g) => g.current);
                            if (latestDocs.length === 0) return false;
                            return latestDocs.every((d: any) => d.verify === true);
                        })();

                        if (!isInternalUser || !section4AllVerified) return null;

                        return (
                            <div className="mt-2 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
                                <Button
                                    onClick={() => openPenjaluranModal('merah')}
                                    disabled={isUpdatingPenjaluran}
                                    className="rounded-lg bg-gradient-to-r from-rose-500 to-rose-600 px-6 py-3 text-center text-sm font-medium text-white shadow-md transition-all duration-300 hover:from-rose-600 hover:to-rose-700 hover:shadow-lg focus:ring-4 focus:ring-rose-300 focus:outline-none"
                                >
                                    {trans.red_line}
                                </Button>
                                <Button
                                    onClick={() => openPenjaluranModal('hijau')}
                                    disabled={isUpdatingPenjaluran}
                                    className="rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-center text-sm font-medium text-white shadow-md transition-all duration-300 hover:from-green-600 hover:to-green-700 hover:shadow-lg focus:ring-4 focus:ring-green-300 focus:outline-none"
                                >
                                    {trans.green_line}
                                </Button>
                            </div>
                        );
                    })()}

                    {/* Modal Konfirmasi Penjaluran */}
                    <Dialog open={penjaluranModalOpen} onOpenChange={setPenjaluranModalOpen}>
                        <DialogContent className="max-w-sm rounded-2xl p-0">
                            <DialogHeader className="px-6 pt-6 pb-2">
                                <DialogTitle className="flex items-center gap-2 text-base font-bold">
                                    <span className={`inline-block h-3 w-3 rounded-full ${pendingJalur === 'merah' ? 'bg-rose-500' : 'bg-green-500'}`} />
                                    {pendingJalur === 'merah' ? trans.red_line : trans.green_line}
                                </DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4 px-6 pb-2">
                                <p className="text-sm text-slate-500">{trans.complete_registration_data}</p>

                                {/* No. Pendaftaran */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{trans.register_number}</Label>
                                    <Input
                                        placeholder={trans.placeholder_register_number}
                                        value={registerNumber}
                                        onChange={(e) => setRegisterNumber(e.target.value)}
                                        className="h-9 rounded-lg border-slate-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>

                                {/* Tanggal Pendaftaran */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{trans.register_date}</Label>
                                    <Input
                                        type="date"
                                        value={registerDate}
                                        onChange={(e) => setRegisterDate(e.target.value)}
                                        className="date-input-dark h-9 rounded-lg border-slate-200 bg-white text-xs text-slate-700 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                                    />
                                </div>
                            </div>

                            <DialogFooter className="flex gap-2 rounded-b-2xl border-t bg-slate-50 px-6 py-4">
                                <Button variant="outline" onClick={() => setPenjaluranModalOpen(false)} className="flex-1" disabled={isUpdatingPenjaluran}>
                                    {trans.cancel}
                                </Button>
                                <Button
                                    onClick={handleUpdatePenjaluran}
                                    disabled={isUpdatingPenjaluran || !registerNumber || !registerDate}
                                    className={`flex-1 text-white ${pendingJalur === 'merah' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-green-500 hover:bg-green-600'
                                        }`}
                                >
                                    {isUpdatingPenjaluran ? trans.saving : trans.save}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Download All Documents as ZIP */}
                    {(() => {
                        // Cek apakah semua dokumen di id_section 1 DAN id_section 2 sudah verified
                        const isSectionAllVerified = (idSection: number) => {
                            const sec = sectionsTransProp?.find((s: any) => s.id_section === idSection);
                            if (!sec) return false;
                            const latestDocs = (processedSectionDocs.get(sec.id) || []).map((g) => g.current);
                            if (latestDocs.length === 0) return false;
                            return latestDocs.every((d: any) => d.verify === true);
                        };

                        if (!isInternalUser || !isSectionAllVerified(1) || !isSectionAllVerified(2)) return null;

                        return (
                            <div className="mt-2 flex justify-center">
                                <button
                                    onClick={handleDownloadZip}
                                    disabled={isDownloadingZip}
                                    className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-blue-500 dark:hover:bg-blue-950 dark:hover:text-blue-400"
                                >
                                    <Archive className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                                    {isDownloadingZip ? 'Mengunduh...' : 'Unduh Semua Dokumen (.zip)'}
                                </button>
                            </div>
                        );
                    })()}

                </div>
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-85 rounded-xl p-0 sm:max-w-100">
                    {/* Header Modal */}
                    <DialogHeader className="px-4 py-3">
                        <DialogTitle className="text-left text-lg font-bold">{trans.additional_doc}</DialogTitle>
                    </DialogHeader>

                    {/* Search Bar */}
                    <div className="px-4 pb-2">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder={trans.search_keyword}
                                className="h-10 rounded-md border-gray-400 pl-9 focus-visible:border-black focus-visible:ring-0"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* List Pilihan Checkbox */}
                    <div className="max-h-75 overflow-y-auto px-4 py-2">
                        {isLoadingDocs ? (
                            <div className="py-8 text-center text-sm text-gray-500">{trans.loading_docs}</div>
                        ) : availableDocuments.length === 0 ? (
                            <div className="py-8 text-center text-sm text-gray-500">{trans.no_available_documents}</div>
                        ) : (
                            <div className="space-y-4">
                                {availableDocuments
                                    .filter((doc) => doc.nama_file.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .map((doc) => (
                                        <div key={doc.id_dokumen} className="flex items-center space-x-3">
                                            <Checkbox
                                                id={`doc-${doc.id_dokumen}`}
                                                checked={selectedDocuments.includes(doc.id_dokumen)}
                                                onCheckedChange={(checked) => handleDocumentCheckboxChange(doc.id_dokumen, checked as boolean)}
                                                className="h-5 w-5 rounded border-2 border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:border-zinc-500 dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black"
                                            />
                                            <label
                                                htmlFor={`doc-${doc.id_dokumen}`}
                                                className="cursor-pointer text-base leading-none font-normal peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                {doc.nama_file}
                                            </label>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* Footer Modal */}
                    <div className="flex flex-col items-center gap-3 border-t p-4 pt-2">
                        {selectedDocuments.length > 0 && <div className="text-sm text-gray-600">{selectedDocuments.length} document(s) selected</div>}
                        <Button
                            className="h-10 w-full rounded-md bg-black text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50"
                            onClick={handleSaveSelectedDocuments}
                            disabled={isSavingDocs || selectedDocuments.length === 0}
                        >
                            {isSavingDocs ? 'Saving...' : trans.save_changes}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={helpModalOpen} onOpenChange={setHelpModalOpen}>
                <DialogContent className="bg-background text-foreground max-w-85 rounded-xl border border-slate-200 p-5 shadow-lg sm:max-w-100 dark:border-zinc-800">
                    <div className="mb-2">
                        <h2 className="text-foreground text-xl leading-tight font-bold">{selectedHelpData?.nama_file}</h2>
                    </div>

                    <div className="text-muted-foreground mb-4 text-sm leading-relaxed">
                        {selectedHelpData?.description_file || 'Tidak ada deskripsi tersedia untuk dokumen ini.'}
                    </div>

                    {selectedHelpData?.link_path_example_file && (
                        <div className="mb-3 space-y-3">
                            <a href={selectedHelpData.link_path_example_file} target="_blank" rel="noreferrer" className="block w-full">
                                <Button
                                    variant="outline"
                                    className="border-border text-primary hover:bg-accent hover:text-primary w-full justify-center rounded-xl text-xs font-semibold shadow-sm transition-all"
                                >
                                    {trans.download_example} {selectedHelpData.nama_file}
                                </Button>
                            </a>
                        </div>
                    )}

                    {selectedHelpData?.link_path_template_file && (
                        <div className="mb-5 space-y-3">
                            <a href={selectedHelpData.link_path_template_file} target="_blank" rel="noreferrer" className="block w-full">
                                <Button
                                    variant="outline"
                                    className="border-border text-primary hover:bg-accent hover:text-primary w-full justify-center rounded-xl text-xs font-semibold shadow-sm transition-all"
                                >
                                    {trans.download_template} {selectedHelpData.nama_file}
                                </Button>
                            </a>
                        </div>
                    )}

                    {videoUrl && videoId && (
                        <div>
                            <h3 className="text-foreground mb-2 text-sm font-bold">{trans.video_tutorial}</h3>

                            <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800">
                                {isVideoPlaying ? (
                                    <iframe
                                        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                                        title="YouTube video player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                        className="absolute inset-0 h-full w-full"
                                    ></iframe>
                                ) : (
                                    <button
                                        onClick={() => setIsVideoPlaying(true)}
                                        className="group relative flex h-full w-full items-center justify-center"
                                    >
                                        {thumbnailUrl && (
                                            <img
                                                src={thumbnailUrl || undefined}
                                                alt="Video thumbnail"
                                                className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                                            />
                                        )}

                                        <div className="bg-background/95 text-foreground relative z-10 flex h-14 w-14 items-center justify-center rounded-full shadow-md transition-transform group-hover:scale-110">
                                            <Play className="ml-1 h-6 w-6 fill-current" />
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <RejectionDialog
                open={rejectionModalOpen}
                onOpenChange={setRejectionModalOpen}
                onSubmit={(note: string, file: File | null) => rejectingDocId && handleSubmitReject(rejectingDocId, note, file)}
                trans={trans}
                isProcessing={verifyingDocId !== null}
            />

            <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {trans.history || 'History'}: {selectedHistoryTitle}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[60vh] space-y-3 overflow-y-auto py-2">
                        {selectedHistoryDocs.map((doc, idx) => {
                            const isVerified = doc.verify === true;
                            const isRejected = doc.verify === false;

                            return (
                                <div key={doc.id} className="flex flex-col gap-1 border-b pb-2 last:border-0">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-semibold text-gray-700">
                                            {trans.version || 'Version'} {selectedHistoryDocs.length - idx}
                                        </span>{' '}
                                        <span className="text-xs text-gray-500">{doc.created_at || 'Unknown Date'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <a
                                            href={`/file/view/${doc.url_path_file}`}
                                            target="_blank"
                                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                        >
                                            <FileText className="h-3 w-3" /> {doc.nama_file}
                                        </a>
                                        {isVerified && <span className="rounded bg-green-100 px-1 text-[10px] text-green-700">{trans.verified}</span>}
                                        {isRejected && <span className="rounded bg-red-100 px-1 text-[10px] text-red-700">{trans.rejected}</span>}
                                    </div>
                                    {isRejected && (
                                        <div className="text-xs text-red-600 italic">
                                            {trans.note || 'Note'}: "{doc.correction_description}"
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setHistoryModalOpen(false)}>
                            {trans.close || 'Close'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddSectionModalOpen} onOpenChange={setIsAddSectionModalOpen}>
                <DialogContent className="max-w-85 rounded-xl p-0 sm:max-w-100">
                    <DialogHeader className="px-4 py-3">
                        <DialogTitle className="text-left text-lg font-bold">{trans.add_section || 'Add Section'}</DialogTitle>
                    </DialogHeader>

                    <div className="px-4 pb-2">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder={trans.search_section || 'Search section'}
                                className="h-10 rounded-md border-gray-400 pl-9 focus-visible:border-black focus-visible:ring-0"
                                value={sectionSearchQuery}
                                onChange={(e) => setSectionSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="max-h-75 overflow-y-auto px-4 py-2">
                        {isLoadingSections ? (
                            <div className="py-8 text-center text-sm text-gray-500">{trans.loading_sections || 'Loading sections...'}</div>
                        ) : availableSections.length === 0 ? (
                            <div className="py-8 text-center text-sm text-gray-500">{trans.no_available_sections || 'No available sections'}</div>
                        ) : (
                            <div className="space-y-4">
                                {availableSections
                                    .filter((section) => section.section_name.toLowerCase().includes(sectionSearchQuery.toLowerCase()))
                                    .map((section) => (
                                        <div key={section.id_section} className="flex items-center space-x-3">
                                            <Checkbox
                                                id={`section-${section.id_section}`}
                                                checked={selectedSections.includes(section.id_section)}
                                                onCheckedChange={(checked) => handleSectionCheckboxChange(section.id_section, checked as boolean)}
                                                className="h-5 w-5 rounded border-2 border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:border-zinc-500 dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black"
                                            />
                                            <label
                                                htmlFor={`section-${section.id_section}`}
                                                className="cursor-pointer text-base leading-none font-normal"
                                            >
                                                {section.section_name}
                                            </label>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-center gap-3 border-t p-4 pt-2">
                        {selectedSections.length > 0 && <div className="text-sm text-gray-600">{selectedSections.length} section(s) selected</div>}
                        <Button
                            className="h-10 w-full rounded-md bg-black text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50"
                            onClick={handleSaveSelectedSections}
                            disabled={isSavingSections || selectedSections.length === 0}
                        >
                            {isSavingSections ? 'Saving...' : trans.save_changes || 'Save Changes'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <EmailModal
                open={openEmailModal}
                onOpenChange={setOpenEmailModal}
                idCustomer={(shipmentData as any)?.id_customer}
                idSpk={shipmentData?.id_spk}
                sections={sectionsTransProp}
            />

            <Dialog open={isRemoveDocumentModalOpen} onOpenChange={setIsRemoveDocumentModalOpen}>
                <DialogContent className="max-w-md rounded-2xl p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold dark:text-white">
                            <AlertTriangle className="h-6 w-6 text-rose-500" />
                            {trans.confirm_removal || 'Konfirmasi Hapus'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-4">
                        <p className="text-slate-600 dark:text-zinc-400">
                            Apakah Anda yakin ingin menghapus dokumen{' '}
                            <span className="font-bold text-slate-900 dark:text-white">"{documentToRemove?.master_document?.nama_dokumen || documentToRemove?.nama_file}"</span>{' '}
                            dari section ini?
                        </p>
                    </div>

                    <DialogFooter className="flex gap-3 sm:justify-end">
                        <Button
                            variant="outline"
                            className="rounded-xl border-slate-200 px-6 dark:border-zinc-700 dark:text-zinc-300"
                            onClick={() => setIsRemoveDocumentModalOpen(false)}
                            disabled={isRemovingDocument}
                        >
                            {trans.cancel || 'Batal'}
                        </Button>
                        <Button
                            variant="destructive"
                            className="rounded-xl bg-rose-600 px-6 text-white hover:bg-rose-700 disabled:opacity-50"
                            onClick={confirmRemoveDocument}
                            disabled={isRemovingDocument}
                        >
                            {isRemovingDocument ? trans.removing || 'Menghapus...' : trans.confirm_delete || 'Hapus Sekarang'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isRemoveSectionModalOpen} onOpenChange={setIsRemoveSectionModalOpen}>
                <DialogContent className="max-w-md rounded-2xl p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold dark:text-white">
                            <AlertTriangle className="h-6 w-6 text-rose-500" />
                            {trans.confirm_removal || 'Konfirmasi Hapus'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-4">
                        <p className="text-slate-600 dark:text-zinc-400">
                            Apakah Anda yakin ingin menghapus section{' '}
                            <span className="font-bold text-slate-900 dark:text-white">"{sectionToRemove?.section_name}"</span>? Semua dokumen di
                            dalam section ini juga akan dihapus secara permanen.
                        </p>
                    </div>

                    <DialogFooter className="flex gap-3 sm:justify-end">
                        <Button
                            variant="outline"
                            className="rounded-xl border-slate-200 px-6 dark:border-zinc-700 dark:text-zinc-300"
                            onClick={() => setIsRemoveSectionModalOpen(false)}
                            disabled={isRemovingSection}
                        >
                            {trans.cancel || 'Batal'}
                        </Button>
                        <Button
                            variant="destructive"
                            className="rounded-xl bg-rose-600 px-6 text-white hover:bg-rose-700 disabled:opacity-50"
                            onClick={confirmRemoveSection}
                            disabled={isRemovingSection}
                        >
                            {isRemovingSection ? trans.removing || 'Menghapus...' : trans.confirm_delete || 'Hapus Sekarang'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={confirmVerifyModalOpen} onOpenChange={setConfirmVerifyModalOpen}>
                <DialogContent className="max-w-md rounded-2xl p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold dark:text-white">
                            <CircleHelp className="h-6 w-6 text-blue-500" />
                            Konfirmasi Verifikasi
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-4">
                        <p className="text-slate-600 dark:text-zinc-400">
                            Mohon Konfirmasi Ulang Setelah anda menyatakan yakin pada data{' '}
                            <span className="font-bold text-slate-900 dark:text-white">
                                "{docToVerify?.master_document?.nama_dokumen || docToVerify?.nama_file}"
                            </span>{' '}
                            maka segala bentuk konsekuensi akan menjadi tanggung jawab pihak importir/eksportir
                        </p>
                    </div>

                    <DialogFooter className="flex gap-3 sm:justify-end">
                        <Button
                            variant="outline"
                            className="rounded-xl border-slate-200 px-6 dark:border-zinc-700 dark:text-zinc-300"
                            onClick={() => {
                                setConfirmVerifyModalOpen(false);
                                setDocToVerify(null);
                            }}
                        >
                            {trans.cancel || 'Batal'}
                        </Button>
                        <Button
                            className="rounded-xl bg-black px-6 text-white hover:bg-gray-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
                            onClick={() => {
                                if (docToVerify) {
                                    toggleVerificationState(docToVerify.id);
                                }
                                setConfirmVerifyModalOpen(false);
                                setDocToVerify(null);
                            }}
                        >
                            {trans.confirm || 'Ya, Saya Yakin'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Sub-component for Rejection Dialog to prevent parent re-renders while typing
function RejectionDialog({ open, onOpenChange, onSubmit, trans, isProcessing }: any) {
    const [note, setNote] = useState('');
    const [file, setFile] = useState<File | null>(null);

    // Reset local state when opened
    useEffect(() => {
        if (open) {
            setNote('');
            setFile(null);
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{trans.reject_document || 'Reject Document'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>{trans.rejection_reason || 'Reason for Rejection'}</Label>
                        <Textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={trans.placeholder_rejection || 'Enter reason for rejection...'}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{trans.correction_file || 'Correction File (Optional)'}</Label>
                        <Input type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {trans.cancel}
                    </Button>
                    <Button
                        style={{ color: 'white' }}
                        variant="destructive"
                        onClick={() => onSubmit(note, file)}
                        disabled={isProcessing}
                    >
                        {isProcessing ? trans.rejecting || 'Rejecting...' : trans.confirm_rejection || 'Confirm Rejection'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
