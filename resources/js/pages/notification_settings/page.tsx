import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Company {
    id_perusahaan: number;
    nama_perusahaan: string;
}

interface PageProps {
    companies: Company[];
    roles: string[];
}

const EVENT_TYPES = [
    { id: 'spk_created', label: 'SPK Created' },
    { id: 'spk_assigned', label: 'Staff Assigned' },
    { id: 'document_uploaded', label: 'Document Uploaded' },
    { id: 'document_verified', label: 'Document Verified' },
    { id: 'document_rejected', label: 'Document Rejected' },
    { id: 'section_added', label: 'Section Added' },
    { id: 'document_added', label: 'Document Added' },
];

export default function NotificationSettings({ companies, roles }: PageProps) {
    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'channel' | 'reminder'>('channel');

    const [channelSettings, setChannelSettings] = useState<any[]>([]);
    const [reminderSettings, setReminderSettings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (companies.length > 0 && !selectedCompany) {
            setSelectedCompany(companies[0].id_perusahaan.toString());
        }
    }, [companies]);

    useEffect(() => {
        if (selectedCompany) {
            fetchSettings(selectedCompany);
        }
    }, [selectedCompany]);

    const fetchSettings = async (companyId: string) => {
        setIsLoading(true);
        try {
            const response = await axios.get(`/notification-settings/companies/${companyId}/data`);
            setChannelSettings(response.data.channelSettings || []);
            setReminderSettings(response.data.reminderSettings || []);
        } catch (error) {
            toast.error('Gagal mengambil pengaturan perusahaan.');
        } finally {
            setIsLoading(false);
        }
    };

    const getChannelValue = (role: string, eventType: string, channel: 'email' | 'notification') => {
        const setting = channelSettings.find((s) => s.role_internal === role && s.event_type === eventType);
        if (!setting) return true; // Default behavior
        return channel === 'email' ? setting.send_email : setting.send_notification;
    };

    const handleChannelChange = async (role: string, eventType: string, channel: 'email' | 'notification', value: boolean) => {
        const currentEmail = getChannelValue(role, eventType, 'email');
        const currentNotif = getChannelValue(role, eventType, 'notification');

        const payload = {
            id_perusahaan: selectedCompany,
            role_internal: role,
            event_type: eventType,
            send_email: channel === 'email' ? value : currentEmail,
            send_notification: channel === 'notification' ? value : currentNotif,
        };

        // Optimistic UI Update
        const newSettings = [...channelSettings];
        const existingIndex = newSettings.findIndex((s) => s.role_internal === role && s.event_type === eventType);
        if (existingIndex > -1) {
            newSettings[existingIndex] = { ...newSettings[existingIndex], ...payload };
        } else {
            newSettings.push(payload);
        }
        setChannelSettings(newSettings);

        try {
            await axios.post('/notification-settings/channel', payload);
            toast.success('Pengaturan Channel disimpan.');
        } catch (error) {
            toast.error('Gagal menyimpan pengaturan.');
            fetchSettings(selectedCompany); // Revert
        }
    };

    const getReminderValue = (role: string, type: 'deadline' | 'eta') => {
        const setting = reminderSettings.find((s) => s.role_internal === role && s.reminder_type === type);
        return (
            setting || {
                is_active: false,
                days_before: [],
                send_email: true,
                send_notification: true,
            }
        );
    };

    const handleReminderChange = async (role: string, type: 'deadline' | 'eta', field: string, value: any) => {
        const current = getReminderValue(role, type);

        let processedValue = value;
        if (field === 'days_before') {
            // parse string "5, 3, 1" to array of integers
            processedValue = value
                .split(',')
                .map((v: string) => parseInt(v.trim()))
                .filter((v: number) => !isNaN(v));
        }

        const payload = {
            id_perusahaan: selectedCompany,
            role_internal: role,
            reminder_type: type,
            is_active: field === 'is_active' ? value : current.is_active,
            send_email: field === 'send_email' ? value : current.send_email,
            send_notification: field === 'send_notification' ? value : current.send_notification,
            days_before: field === 'days_before' ? processedValue : current.days_before,
        };

        // Optimistic UI Update
        const newSettings = [...reminderSettings];
        const existingIndex = newSettings.findIndex((s) => s.role_internal === role && s.reminder_type === type);
        if (existingIndex > -1) {
            newSettings[existingIndex] = { ...newSettings[existingIndex], ...payload };
        } else {
            newSettings.push(payload);
        }
        setReminderSettings(newSettings);

        try {
            await axios.post('/notification-settings/reminder', payload);
            toast.success('Pengaturan Reminder disimpan.');
        } catch (error) {
            toast.error('Gagal menyimpan pengaturan.');
            fetchSettings(selectedCompany); // Revert
        }
    };

    return (
        <AppSidebarLayout
            breadcrumbs={[
                { title: 'Settings', url: '#' },
                { title: 'Notification', url: '#' },
            ]}
        >
            <Head title="Notification Settings" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold tracking-tight">Notification Settings</h1>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Perusahaan:</span>
                        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                            <SelectTrigger className="w-[250px]">
                                <SelectValue placeholder="Pilih Perusahaan" />
                            </SelectTrigger>
                            <SelectContent>
                                {companies.map((c) => (
                                    <SelectItem key={c.id_perusahaan} value={c.id_perusahaan.toString()}>
                                        {c.nama_perusahaan}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex gap-4 border-b">
                    <button
                        onClick={() => setActiveTab('channel')}
                        className={`px-4 pb-2 font-medium transition-colors ${
                            activeTab === 'channel' ? 'border-primary text-primary border-b-2' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Channel Settings (Email & In-App)
                    </button>
                    <button
                        onClick={() => setActiveTab('reminder')}
                        className={`px-4 pb-2 font-medium transition-colors ${
                            activeTab === 'reminder' ? 'border-primary text-primary border-b-2' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Automated Reminders
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex h-40 items-center justify-center">Loading settings...</div>
                ) : (
                    <>
                        {activeTab === 'channel' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Channel Toggles</CardTitle>
                                    <CardDescription>
                                        Aktifkan atau nonaktifkan Email dan Notifikasi In-App untuk setiap aktivitas dan role.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="max-h-[calc(100vh-18rem)] overflow-auto rounded-md border">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-muted text-muted-foreground sticky top-0 z-20 text-xs uppercase">
                                                <tr>
                                                    <th className="border-r p-4 font-medium">Event Type</th>
                                                    {roles.map((role) => (
                                                        <th key={role} className="border-r p-4 text-center font-medium capitalize">
                                                            {role}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {EVENT_TYPES.map((event) => (
                                                    <tr key={event.id} className="border-b last:border-b-0">
                                                        <td className="bg-muted/30 border-r p-4 font-medium">{event.label}</td>
                                                        {roles.map((role) => (
                                                            <td key={`${event.id}-${role}`} className="border-r p-4 align-top">
                                                                <div className="flex flex-col items-center gap-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <Checkbox
                                                                            checked={getChannelValue(role, event.id, 'email')}
                                                                            onCheckedChange={(val) =>
                                                                                handleChannelChange(role, event.id, 'email', val as boolean)
                                                                            }
                                                                            id={`email-${event.id}-${role}`}
                                                                        />
                                                                        <label
                                                                            htmlFor={`email-${event.id}-${role}`}
                                                                            className="cursor-pointer text-xs"
                                                                        >
                                                                            Email
                                                                        </label>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <Checkbox
                                                                            checked={getChannelValue(role, event.id, 'notification')}
                                                                            onCheckedChange={(val) =>
                                                                                handleChannelChange(role, event.id, 'notification', val as boolean)
                                                                            }
                                                                            id={`notif-${event.id}-${role}`}
                                                                        />
                                                                        <label
                                                                            htmlFor={`notif-${event.id}-${role}`}
                                                                            className="cursor-pointer text-xs"
                                                                        >
                                                                            In-App
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {activeTab === 'reminder' && (
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {/* Deadline Reminders */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Section Deadline Reminders</CardTitle>
                                        <CardDescription>Notifikasi otomatis sebelum batas waktu section.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {roles.map((role) => {
                                            const val = getReminderValue(role, 'deadline');
                                            return (
                                                <div key={`dl-${role}`} className="flex flex-col gap-3 rounded-md border p-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-semibold capitalize">{role}</h4>
                                                        <div className="flex items-center gap-2">
                                                            <Checkbox
                                                                checked={val.is_active}
                                                                onCheckedChange={(c) => handleReminderChange(role, 'deadline', 'is_active', c)}
                                                                id={`dl-active-${role}`}
                                                            />
                                                            <label htmlFor={`dl-active-${role}`} className="text-sm">
                                                                Active
                                                            </label>
                                                        </div>
                                                    </div>
                                                    {val.is_active && (
                                                        <>
                                                            <div className="flex flex-col gap-1">
                                                                <label className="text-xs text-gray-500">
                                                                    Kirim Peringatan pada (H-x) Hari. Pisahkan dengan koma.
                                                                </label>
                                                                <Input
                                                                    placeholder="e.g. 5, 3, 1"
                                                                    defaultValue={val.days_before?.join(', ')}
                                                                    onBlur={(e) =>
                                                                        handleReminderChange(role, 'deadline', 'days_before', e.target.value)
                                                                    }
                                                                />
                                                            </div>
                                                            <div className="mt-2 flex items-center gap-4">
                                                                <div className="flex items-center gap-2">
                                                                    <Checkbox
                                                                        checked={val.send_email}
                                                                        onCheckedChange={(c) =>
                                                                            handleReminderChange(role, 'deadline', 'send_email', c)
                                                                        }
                                                                        id={`dl-em-${role}`}
                                                                    />
                                                                    <label htmlFor={`dl-em-${role}`} className="text-sm">
                                                                        Email
                                                                    </label>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Checkbox
                                                                        checked={val.send_notification}
                                                                        onCheckedChange={(c) =>
                                                                            handleReminderChange(role, 'deadline', 'send_notification', c)
                                                                        }
                                                                        id={`dl-notif-${role}`}
                                                                    />
                                                                    <label htmlFor={`dl-notif-${role}`} className="text-sm">
                                                                        In-App
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>

                                {/* ETA Reminders */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>ETA Kapal Reminders</CardTitle>
                                        <CardDescription>Notifikasi otomatis sebelum kedatangan kapal.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {roles.map((role) => {
                                            const val = getReminderValue(role, 'eta');
                                            return (
                                                <div key={`eta-${role}`} className="flex flex-col gap-3 rounded-md border p-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-semibold capitalize">{role}</h4>
                                                        <div className="flex items-center gap-2">
                                                            <Checkbox
                                                                checked={val.is_active}
                                                                onCheckedChange={(c) => handleReminderChange(role, 'eta', 'is_active', c)}
                                                                id={`eta-active-${role}`}
                                                            />
                                                            <label htmlFor={`eta-active-${role}`} className="text-sm">
                                                                Active
                                                            </label>
                                                        </div>
                                                    </div>
                                                    {val.is_active && (
                                                        <>
                                                            <div className="flex flex-col gap-1">
                                                                <label className="text-xs text-gray-500">
                                                                    Kirim Peringatan pada (H-x) Hari. Pisahkan dengan koma.
                                                                </label>
                                                                <Input
                                                                    placeholder="e.g. 5, 3, 1"
                                                                    defaultValue={val.days_before?.join(', ')}
                                                                    onBlur={(e) => handleReminderChange(role, 'eta', 'days_before', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="mt-2 flex items-center gap-4">
                                                                <div className="flex items-center gap-2">
                                                                    <Checkbox
                                                                        checked={val.send_email}
                                                                        onCheckedChange={(c) => handleReminderChange(role, 'eta', 'send_email', c)}
                                                                        id={`eta-em-${role}`}
                                                                    />
                                                                    <label htmlFor={`eta-em-${role}`} className="text-sm">
                                                                        Email
                                                                    </label>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Checkbox
                                                                        checked={val.send_notification}
                                                                        onCheckedChange={(c) =>
                                                                            handleReminderChange(role, 'eta', 'send_notification', c)
                                                                        }
                                                                        id={`eta-notif-${role}`}
                                                                    />
                                                                    <label htmlFor={`eta-notif-${role}`} className="text-sm">
                                                                        In-App
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppSidebarLayout>
    );
}
