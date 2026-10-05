"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Search, Filter, MoreVertical, Phone, Mail, Award, Users, X, Loader2, Trash2, Edit2, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function DriversDepotPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [depot, setDepot] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    license: '',
    phone: '',
    email: '',
    experience: ''
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [showOptionsId, setShowOptionsId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});

  const fetchDrivers = async () => {
    try {
      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();
      
      if (!sessionData.authenticated || !['CentralAdmin', 'DepotAdmin'].includes(sessionData.user.role)) {
        router.push('/dashboard');
        return;
      }
      setUserRole(sessionData.user.role);

      if ((sessionData.user.role === 'DepotAdmin') && sessionData.user.depotId !== id) {
        router.push(`/drivers/${sessionData.user.depotId}`);
        return;
      }

      // Fetch Depot
      const depotsRes = await fetch('/api/depots');
      const depotsData = await depotsRes.json();
      const currentDepot = depotsData.depots?.find((d: any) => d.id === id);
      setDepot(currentDepot);

      // Fetch Drivers for this depot
      const res = await fetch(`/api/drivers?depotId=${id}`);
      const data = await res.json();
      if (data.drivers) {
        setDrivers(data.drivers);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [id, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openEditModal = (driver: any) => {
    setFormData({
      name: driver.name,
      license: driver.licenseNumber,
      phone: driver.phone,
      email: driver.email,
      experience: driver.experience
    });
    setEditingDriverId(driver.id);
    setIsEditMode(true);
    setIsModalOpen(true);
    setShowOptionsId(null);
  };

  const handleSubmitDriver = async (e: React.FormEvent) => {
    e.preventDefault();
        setIsSaving(true);
    try {
      const url = isEditMode && editingDriverId ? `/api/drivers/${editingDriverId}` : '/api/drivers';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const payload = isEditMode ? formData : { ...formData, depotId: id };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ name: '', license: '', phone: '', email: '', experience: '' });
        setIsEditMode(false);
        setEditingDriverId(null);
        toast.success(isEditMode ? 'Driver updated successfully!' : 'Driver added successfully!');
        fetchDrivers(); // Refresh list
      } else {
        toast.error(`Failed to ${isEditMode ? 'update' : 'add'} driver`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred while saving the driver');
    } finally {
      setIsSaving(false);
    }
  };

  const executeDeleteDriver = async () => {
    if (!confirmModal.id) return;
    try {
      const res = await fetch(`/api/drivers/${confirmModal.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Driver deleted successfully!');
        fetchDrivers();
      } else {
        toast.error('Failed to delete driver');
      }
    } catch (error) {
      console.error('Error deleting driver:', error);
      toast.error('Error deleting driver');
    } finally {
      setConfirmModal({isOpen: false, id: null});
    }
  };

  const handleApproveDriver = async (driverId: string) => {
        try {
      const res = await fetch(`/api/drivers/${driverId}`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalStatus: 'Approved' })
      });
      if (res.ok) {
        toast.success('Driver approved successfully!');
        fetchDrivers();
      } else {
        toast.error('Failed to approve driver');
      }
    } catch (error) {
      console.error('Error approving driver:', error);
      toast.error('Error approving driver');
    }
    setShowOptionsId(null);
  };

  const handleViewProfile = (driver: any) => {
    setSelectedDriver(driver);
    setIsViewModalOpen(true);
  };

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          driver.licenseNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          driver.id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All Status' || driver.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const availableCount = drivers.filter(d => d.status === 'Available').length;
  const onTripCount = drivers.filter(d => d.status === 'On Trip').length;

  if (isLoading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (!depot) {
    return <div className="p-8 text-center text-slate-500">Depot not found.</div>;
  }

  return (
    <div className="space-y-6 relative animate-in fade-in duration-500">
      <div className="flex items-center text-sm font-medium text-slate-500 cursor-pointer hover:text-blue-600 w-fit" onClick={() => router.push('/drivers')}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Depots
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-lg shadow-blue-200">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center">
            <Users className="w-8 h-8 mr-3 text-blue-200" />
            Driver Management
          </h2>
          <p className="text-blue-100 mt-2 font-medium">Depot: {depot.name} ({depot.code})</p>
        </div>
        {(
          <button 
            onClick={() => {
              setFormData({ name: '', license: '', phone: '', email: '', experience: '' });
              setIsEditMode(false);
              setEditingDriverId(null);
              setIsModalOpen(true);
            }}
            className="bg-white text-blue-600 font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-blue-50 transition-all flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add New Driver
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase">Total Drivers</p>
            <p className="text-2xl font-bold text-slate-900">{drivers.length}</p>
          </div>
          <div className="p-4 bg-blue-50 text-blue-600 rounded-xl"><Users className="w-6 h-6" /></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase">Available</p>
            <p className="text-2xl font-bold text-slate-900">{availableCount}</p>
          </div>
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle className="w-6 h-6" /></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase">On Trip</p>
            <p className="text-2xl font-bold text-slate-900">{onTripCount}</p>
          </div>
          <div className="p-4 bg-amber-50 text-amber-600 rounded-xl"><Users className="w-6 h-6" /></div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, license, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all flex-1 md:flex-none">
            <Filter className="h-4 w-4" /> Filter
          </button>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 flex-1 md:flex-none"
          >
            <option>All Status</option>
            <option>Available</option>
            <option>On Trip</option>
            <option>Leave</option>
          </select>
        </div>
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDrivers.map((driver) => (
          <div key={driver.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4 relative">
                <div className="flex items-center space-x-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-inner group-hover:scale-110 transition-transform">
                    <Users className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{driver.name}</h3>
                    <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">{driver.id.slice(0, 8)}... • {driver.experience} Years</p>
                  </div>
                </div>
                
                {/* Options Menu */}
                {(
                  <div className="relative">
                    <button 
                      onClick={() => setShowOptionsId(showOptionsId === driver.id ? null : driver.id)}
                      className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    {showOptionsId === driver.id && (
                      <div className="absolute right-0 mt-2 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden animate-in fade-in zoom-in duration-200">
                        {driver.approvalStatus === 'Pending' && userRole === 'CentralAdmin' && (
                          <button 
                            onClick={() => handleApproveDriver(driver.id)}
                            className="w-full text-left px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 flex items-center"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" /> Approve
                          </button>
                        )}
                        <button 
                          onClick={() => openEditModal(driver)}
                          className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center"
                        >
                          <Edit2 className="h-4 w-4 mr-2" /> Edit
                        </button>
                        <button 
                          onClick={() => {
                            setConfirmModal({isOpen: true, id: driver.id});
                            setShowOptionsId(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-slate-600">
                  <Award className="h-4 w-4 mr-2 text-blue-400" />
                  <span className="font-medium">License:</span>
                  <span className="ml-2 font-mono">{driver.licenseNumber}</span>
                </div>
                <div className="flex items-center text-sm text-slate-600">
                  <Phone className="h-4 w-4 mr-2 text-blue-400" />
                  <span>{driver.phone}</span>
                </div>
                <div className="flex items-center text-sm text-slate-600">
                  <Mail className="h-4 w-4 mr-2 text-blue-400" />
                  <span className="truncate">{driver.email}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              {driver.approvalStatus === 'Pending' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full mr-2 bg-amber-500"></span>
                  Pending Approval
                </span>
              ) : (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  driver.status === 'Available' ? 'bg-emerald-100 text-emerald-700' : 
                  driver.status === 'On Trip' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full mr-2 ${
                    driver.status === 'Available' ? 'bg-emerald-500' : 
                    driver.status === 'On Trip' ? 'bg-blue-500' : 'bg-rose-500'
                  }`}></span>
                  {driver.status}
                </span>
              )}
              <button 
                onClick={() => handleViewProfile(driver)}
                className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                View Profile
              </button>
            </div>
          </div>
        ))}
        {filteredDrivers.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500">
            No drivers found matching your search.
          </div>
        )}
      </div>

      {/* Add Driver Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">{isEditMode ? 'Edit Driver' : 'Add New Driver'}</h3>
              <button onClick={() => {
                setIsModalOpen(false);
                setIsEditMode(false);
                setEditingDriverId(null);
                setFormData({ name: '', license: '', phone: '', email: '', experience: '' });
              }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitDriver} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="e.g. Sunil Perera" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">License No.</label>
                  <input required type="text" name="license" value={formData.license} onChange={handleInputChange} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="WP-1234567" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Experience (Years)</label>
                  <input required type="number" name="experience" value={formData.experience} onChange={handleInputChange} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="e.g. 5" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input required type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="077 123 4567" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="driver@example.com" />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => {
                  setIsModalOpen(false);
                  setIsEditMode(false);
                  setEditingDriverId(null);
                  setFormData({ name: '', license: '', phone: '', email: '', experience: '' });
                }} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg flex items-center">
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isSaving ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update Driver' : 'Save Driver')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Profile Modal */}
      {isViewModalOpen && selectedDriver && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">Driver Profile</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border border-blue-200">
                  <Users className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-slate-900">{selectedDriver.name}</h3>
                  <p className="text-sm text-slate-500">ID: {selectedDriver.id}</p>
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Status</span>
                  <span className="text-sm font-bold text-slate-900">{selectedDriver.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">License No</span>
                  <span className="text-sm font-bold font-mono text-slate-900">{selectedDriver.licenseNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Experience</span>
                  <span className="text-sm font-bold text-slate-900">{selectedDriver.experience} Years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Phone</span>
                  <span className="text-sm font-bold text-slate-900">{selectedDriver.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Email</span>
                  <span className="text-sm font-bold text-slate-900">{selectedDriver.email}</span>
                </div>
              </div>
              
              <div className="pt-2 flex justify-end">
                <button onClick={() => setIsViewModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all">Close Profile</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Delete Driver"
        message="Are you sure you want to delete this driver? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={executeDeleteDriver}
        onCancel={() => setConfirmModal({isOpen: false, id: null})}
      />
    </div>
  );
}
