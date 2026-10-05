"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle, Globe, Mail, MapPin, RefreshCw, Bell, Shield, Type } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useApp } from '@/context/LanguageContext';

export default function SettingsPage() {
  const { t, setLanguage, setTheme, setFontSize, setNMode, setNotifications } = useApp();
  const [formData, setFormData] = useState({
    depotName: '',
    adminEmail: '',
    location: '',
    notifications: true,
    autoBackup: false,
    nMode: false,
    language: 'English',
    theme: 'Light Mode',
    fontSize: 'Medium'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleFirebaseSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/firebase-sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Sync Successful! All tables uploaded.');
      } else {
        toast.error(`Sync Failed: ${data.error}`);
      }
    } catch (error) {
      toast.error('Sync Failed: System Error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch('/api/backup-data', { method: 'GET' });
      if (!res.ok) {
        toast.error('Backup Failed: Could not fetch backup data.');
        return;
      }
      
      const data = await res.json();
      const timestamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
      
      // Dynamic imports for heavy libraries to keep initial load fast
      const XLSX = await import('xlsx');
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      // --- GENERATE EXCEL ---
      const workbook = XLSX.utils.book_new();
      for (const [tableName, tableData] of Object.entries(data)) {
        if (tableName === 'depots') {
          const worksheet = XLSX.utils.json_to_sheet(tableData as any[]);
          XLSX.utils.book_append_sheet(workbook, worksheet, tableName.toUpperCase());
          continue;
        }

        if (Array.isArray(tableData) && tableData.length > 0) {
          const sanitizedData = tableData.map((item: any) => {
            const newItem = { ...item };
            if (newItem.password) delete newItem.password;
            if (newItem.depot) {
              newItem.depotName = newItem.depot.name;
              delete newItem.depot;
            }
            return newItem;
          });

          const groupedData: any[] = [];
          const depotsList = Array.from(new Set(sanitizedData.map(item => item.depotName || 'Unassigned Depot')));
          
          for (const depotName of depotsList) {
            const dummyRow: any = {};
            const keys = Object.keys(sanitizedData[0]);
            keys.forEach((k, idx) => {
              dummyRow[k] = idx === 0 ? `--- ${String(depotName).toUpperCase()} ---` : '';
            });
            groupedData.push(dummyRow);
            groupedData.push(...sanitizedData.filter(item => (item.depotName || 'Unassigned Depot') === depotName));
            const blankRow: any = {};
            keys.forEach(k => blankRow[k] = '');
            groupedData.push(blankRow);
          }

          const worksheet = XLSX.utils.json_to_sheet(groupedData);
          XLSX.utils.book_append_sheet(workbook, worksheet, tableName.toUpperCase());
        } else {
          const worksheet = XLSX.utils.json_to_sheet([{ Info: 'No data available' }]);
          XLSX.utils.book_append_sheet(workbook, worksheet, tableName.toUpperCase());
        }
      }
      XLSX.writeFile(workbook, `SRMSS_Backup_${timestamp}.xlsx`);

      // --- GENERATE PDF ---
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('SRMSS Database Backup Report', 14, 22);
      doc.setFontSize(11);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
      
      let currentY = 40;
      
      const allDepots = Array.from(new Set(
        Object.values(data)
          .flat()
          .map((item: any) => item?.depot?.name || item?.depotName)
          .filter(Boolean)
      ));
      if (allDepots.length === 0) allDepots.push('Unassigned Depot');

      for (const depotName of allDepots) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }
        
        // Add Header for Depot
        doc.setFontSize(16);
        doc.setTextColor(220, 38, 38); // Red color for heading
        doc.text(`=== ${String(depotName).toUpperCase()} ===`, 14, currentY);
        doc.setTextColor(0);
        currentY += 10;

        for (const [tableName, tableData] of Object.entries(data)) {
          if (tableName === 'depots') continue; // Skip depots table itself in the loop to avoid redundancy
          if (!Array.isArray(tableData) || tableData.length === 0) continue;

          const depotData = tableData.filter((item: any) => (item?.depot?.name || item?.depotName || 'Unassigned Depot') === depotName);
          if (depotData.length === 0) continue;

          doc.setFontSize(12);
          doc.text(`Table: ${tableName.toUpperCase()}`, 14, currentY);
          currentY += 5;
          
          const cleanData = depotData.map((item: any) => {
            const newItem = { ...item };
            delete newItem.password;
            delete newItem.depot;
            delete newItem.depotName;
            return newItem;
          });

          const keys = Object.keys(cleanData[0]);
          const rows = cleanData.map(item => keys.map(k => String(item[k as keyof typeof item] || '')));
          
          autoTable(doc, {
            head: [keys.map(k => k.toUpperCase())],
            body: rows,
            startY: currentY,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [37, 99, 235] }
          });
          
          currentY = (doc as any).lastAutoTable.finalY + 10;
          
          if (currentY > 250) {
            doc.addPage();
            currentY = 20;
          }
        }
        
        currentY += 10; 
      }
      
      doc.save(`SRMSS_Backup_${timestamp}.pdf`);

      toast.success('Backup Downloaded (PDF & Excel) Successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Backup Failed: System Error');
    } finally {
      setIsBackingUp(false);
    }
  };

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setUserRole(data.user.role);
        }
      })
      .catch(err => console.error("Error loading session", err));

    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setFormData(prev => ({...prev, ...data}));
      })
      .catch(err => console.error("Error loading settings", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await res.json();
      if (result.success) {
        toast.success(t('settings_saved') || 'Settings Saved Successfully!');
        // Apply all changes instantly to the system
        setLanguage(formData.language);
        setTheme(formData.theme);
        setFontSize(formData.fontSize);
        setNMode(formData.nMode);
        setNotifications(formData.notifications);
      } else {
        toast.error('Failed to save settings.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('An error occurred while saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('settings')}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Configure your depot details and operational modes.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Depot Configuration */}
        {userRole !== 'Driver' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center space-x-3 text-blue-600">
              <Globe className="h-5 w-5" />
              <h3 className="font-bold text-slate-900 dark:text-white">Depot Information</h3>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Depot Name</label>
              <div className="relative">
                <Settings className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text"
                  value={formData.depotName}
                  onChange={(e) => setFormData({...formData, depotName: e.target.value})}
                  disabled={userRole !== 'CentralAdmin'}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Contact Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                  disabled={userRole !== 'CentralAdmin'}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>
        )}

        {/* General Preferences */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center space-x-3 text-emerald-600">
              <Type className="h-5 w-5" />
              <h3 className="font-bold text-slate-900 dark:text-white">General Preferences</h3>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('language')}</label>
              <select 
                value={formData.language}
                onChange={(e) => setFormData({...formData, language: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium dark:text-white cursor-pointer transition-all"
              >
                <option>English</option>
                <option>Tamil</option>
                <option>Sinhala</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('theme')}</label>
              <select 
                value={formData.theme}
                onChange={(e) => setFormData({...formData, theme: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium dark:text-white cursor-pointer transition-all"
              >
                <option>Light Mode</option>
                <option>Dark Mode</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('text_size')}</label>
              <select 
                value={formData.fontSize}
                onChange={(e) => setFormData({...formData, fontSize: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium dark:text-white cursor-pointer transition-all"
              >
                <option>Small</option>
                <option>Medium</option>
                <option>Large</option>
              </select>
            </div>
          </div>
        </div>

        {/* Operational Preferences */}
        {userRole !== 'Driver' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center space-x-3 text-indigo-600">
              <Shield className="h-5 w-5" />
              <h3 className="font-bold text-slate-900 dark:text-white">Operational Preferences</h3>
            </div>
          </div>
          <div className="p-6 space-y-6 divide-y divide-slate-100 dark:divide-slate-700">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">System Notifications</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Alerts for delays and maintenance due.</p>
              </div>
              <button 
                type="button"
                onClick={() => setFormData({...formData, notifications: !formData.notifications})}
                className={`w-12 h-6 rounded-full transition-all relative ${formData.notifications ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.notifications ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between pt-4 pb-2">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">N Mode Settings</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Enable specialized N-type operational workflow.</p>
              </div>
              <button 
                type="button"
                onClick={() => setFormData({...formData, nMode: !formData.nMode})}
                className={`w-12 h-6 rounded-full transition-all relative ${formData.nMode ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.nMode ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Automatic Backup</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Securely backup system data every 24 hours.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, autoBackup: !formData.autoBackup})}
                  className={`w-12 h-6 rounded-full transition-all relative ${formData.autoBackup ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.autoBackup ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Manual Backup</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Download Excel & PDF backup immediately.</p>
                </div>
                <button 
                  type="button"
                  onClick={handleManualBackup}
                  disabled={isBackingUp}
                  className="px-4 py-2 bg-slate-900 dark:bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-slate-800 dark:hover:bg-blue-700 transition-all flex items-center shadow-sm disabled:opacity-50"
                >
                  {isBackingUp ? <RefreshCw className="h-3 w-3 mr-2 animate-spin" /> : <Save className="h-3 w-3 mr-2" />}
                  {isBackingUp ? 'Backing Up...' : 'Backup Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        <div className="flex justify-end pt-4">
          <button 
            type="submit"
            disabled={isSaving}
            className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-2xl transition-all shadow-xl shadow-slate-200 dark:shadow-slate-900 flex items-center disabled:opacity-50 active:scale-[0.98]"
          >
            {isSaving ? <RefreshCw className="h-5 w-5 mr-3 animate-spin" /> : <Save className="h-5 w-5 mr-3" />}
            {t('save_settings')}
          </button>
        </div>
      </form>
    </div>
  );
}
