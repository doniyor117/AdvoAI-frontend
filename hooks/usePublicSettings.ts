import { useState, useEffect } from 'react';

export interface PublicSettings {
    ui_support_email: string;
    global_notification?: string;
    global_notification_type?: string;
}

export function usePublicSettings() {
    const [settings, setSettings] = useState<PublicSettings | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/public/settings`);
                if (res.ok) {
                    const data = await res.json();
                    setSettings({
                        ui_support_email: data.ui_support_email || 'support@advoai.uz',
                        global_notification: data.global_notification || '',
                        global_notification_type: data.global_notification_type || 'info',
                    });
                }
            } catch (err) {
                console.error("Failed to fetch public settings:", err);
                setSettings({
                    ui_support_email: 'support@advoai.uz',
                    global_notification: '',
                    global_notification_type: 'info',
                });
            }
        };

        fetchSettings();
    }, []);

    return { settings };
}
