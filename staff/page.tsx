"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Briefcase, Building2, Search, Plus, MapPin, Users, Edit2, Trash2, X, Loader2, ArrowLeft } from 'lucide-react';
import { useApp } from '@/context/LanguageContext';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function StaffPage() {
  const { nMode } = useApp();
  const router = useRouter();
  
  const [userRole, setUserRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [depots, setDepots] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  
  const [selectedDepot, setSelectedDepot] = useState<any | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    designation: 'Staff',
    status: 'Active',
    depotId: ''
  });

  const fetchData = async () => {
    try {
      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();
      if (!sessionData.authenticated || sessionData.user.role === 'Driver') {
        router.push('/dashboard');
        return;
      }
      setUserRole(sessionData.user.role);

      const staffRes = await fetch('/api/staff');
      const staffData = await staffRes.json();
      
      if (staffData.isCentral) {
        setDepots(staffData.depots);
      } else {
        setStaffMembers(staffData.staff);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Automatically set depotId for DepotAdmin, or use selected depot for CentralAdmin
    let finalDepotId = formData.depotId;
    if (userRole === 'CentralAdmin' && selectedDepot && !finalDepotId) {
      finalDepotId = selectedDepot.id;
    }
    
    const payload = { ...formData, depotId: finalDepotId };

    try {
      const url = isEditMode ? `/api/staff/${editingId}` : '/api/staff';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ name: '', email: '', phone: '', designation: 'Staff', status: 'Active', depotId: '' });
        setIsEditMode(false);
        setEditingId(null);
        
        // Optimistically update if in depot view
        if (userRole === 'CentralAdmin' && selectedDepot) {
          const freshData = await fetch('/api/staff').then(r => r.json());
          setDepots(freshData.depots);
          const updatedDepot = freshData.depots.find((d: any) => d.id === selectedDepot.id);
          setSelectedDepot(updatedDepot);
          setStaffMembers(updatedDepot?.staff || []);
        } else {
          fetchData();
        }
        toast.success(isEditMode ? 'Staff member updated successfully!' : 'Staff member added successfully!');
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to save staff member');
      }
    } catch (error) {
      console.error('Save error', error);
      toast.error('An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const executeDeleteStaff = async () => {
    if (!confirmModal.id) return;
    try {
      const res = await fetch(`/api/staff/${confirmModal.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (userRole === 'CentralAdmin' && selectedDepot) {
          const freshData = await fetch('/api/staff').then(r => r.json());
          setDepots(freshData.depots);
          const updatedDepot = freshData.depots.find((d: any) => d.id === selectedDepot.id);
          setSelectedDepot(updatedDepot);
          setStaffMembers(updatedDepot?.staff || []);
        } else {
          fetchData();
        }
        toast.success('Staff member deleted successfully!');
      } else {
        toast.error('Failed to delete staff member');
      }
    } catch (error) {
      console.error('Delete error', error);
      toast.error('Delete error');
    } finally {
      setConfirmModal({isOpen: false, id: null});
    }
  };

  const openEditModal = (staff: any) => {
    setFormData({
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      designation: staff.designation,
      status: staff.status,
      depotId: staff.depotId
    });
    setEditingId(staff.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const selectDepot = (depot: any) => {
    setSelectedDepot(depot);
    setStaffMembers(depot.staff);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // Calculate totals
  const totalGlobalStaff = depots.reduce((acc, d) => acc + d.staffCount, 0);
  
  const filteredStaff = staffMembers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.designation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
            {userRole === 'CentralAdmin' && selectedDepot && (
              <button onClick={() => setSelectedDepot(null)} className="mr-3 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </button>
            )}
            <Briefcase className="w-8 h-8 mr-3 text-blue-600 dark:text-blue-500" />
            {selectedDepot ? `${selectedDepot.name} - Staff` : 'Staff Management'}
          </h2>
          <p className="text-slate-500 mt-1">
            {userRole === 'CentralAdmin' && !selectedDepot 
              ? 'Select a depot to manage its staff members.' 
              : 'Manage employee details, roles, and status.'}
          </p>
        </div>
        
        {(userRole !== 'CentralAdmin' || selectedDepot) && (
          <button 
            onClick={() => {
              setFormData({ name: '', email: '', phone: '', designation: 'Staff', status: 'Active', depotId: selectedDepot?.id || '' });
              setIsEditMode(false);
              setEditingId(null);
              setIsModalOpen(true);
            }}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-sm shadow-blue-200"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Staff
          </button>
        )}
      </div>

      {userRole === 'CentralAdmin' && !selectedDepot ? (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-900/20 flex items-center justify-between">
            <div>
              <h3 className="text-blue-100 font-medium mb-1">Total Network Staff</h3>
              <p className="text-4xl font-bold">{totalGlobalStaff}</p>
            </div>
            <div className="p-4 bg-white/10 rounded-full">
              <Users className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <h3 className="font-bold text-xl text-slate-900 dark:text-white mt-8 mb-4">Regional Depots</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {depots.map(depot => (
              <div 
                key={depot.id} 
                onClick={() => selectDepot(depot)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 cursor-pointer hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-800 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl group-hover:scale-110 transition-transform">
                    <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {depot.code}
                  </span>
                </div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{depot.name}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center mb-6">
                  <MapPin className="w-4 h-4 mr-1" /> {depot.location}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Total Staff</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{depot.staffCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all dark:text-white"
              />
            </div>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Total: {filteredStaff.length} staff
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Staff Name</th>
                  <th className="px-6 py-4 font-semibold">Contact Info</th>
                  <th className="px-6 py-4 font-semibold">Role / Designation</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredStaff.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No staff found in this depot.</td></tr>
                ) : (
                  filteredStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white">{staff.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 dark:text-white">{staff.phone}</div>
                        <div className="text-xs text-slate-500">{staff.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                          {staff.designation}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          staff.status === 'Active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                          'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {staff.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditModal(staff)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setConfirmModal({isOpen: true, id: staff.id})} className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEditMode ? 'Edit Staff Member' : 'Add New Staff'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="e.g. John Doe" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="john@example.com" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                <input required type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="07XXXXXXXX" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Designation / Role</label>
                <input required type="text" name="designation" value={formData.designation} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="e.g. Mechanic, Cleaner, Logistics Officer" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center shadow-md shadow-blue-200 dark:shadow-none">
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {isEditMode ? 'Update Staff' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Delete Staff Member"
        message="Are you sure you want to delete this staff member? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={executeDeleteStaff}
        onCancel={() => setConfirmModal({isOpen: false, id: null})}
      />
    </div>
  );
}
