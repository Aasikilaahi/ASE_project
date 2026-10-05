"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, ArrowRight, User, Bus as BusIcon, MoreHorizontal, X, Loader2, Search, Filter, Trash2, Eye, Edit2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useApp } from '@/context/LanguageContext';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function SchedulesPage() {
  const { nMode } = useApp();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({ routeName: '', departure: '', arrival: '', busReg: '', driverName: '', conductorName: '', type: 'Daily' });

  // New States for Search, Filter, View, and Delete
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All Types');
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [showOptionsId, setShowOptionsId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});
  const [confirmAssignModal, setConfirmAssignModal] = useState<{isOpen: boolean, message: string}>({isOpen: false, message: ''});

  const fetchSchedules = async () => {
    try {
      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();
      if (sessionData.authenticated) setUserRole(sessionData.user.role);

      const res = await fetch('/api/schedules');
      const data = await res.json();
      if (data.schedules) setSchedules(data.schedules);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openEditModal = (schedule: any) => {
    setFormData({
      routeName: schedule.routeName,
      departure: schedule.departure,
      arrival: schedule.arrival || '',
      busReg: schedule.busReg,
      driverName: schedule.driverName,
      conductorName: schedule.conductorName || '',
      type: schedule.type || 'Daily'
    });
    setEditingScheduleId(schedule.id);
    setIsEditMode(true);
    setIsModalOpen(true);
    setShowOptionsId(null);
  };

  const handleSubmitSchedule = async (e?: React.FormEvent, bypassWarning = false) => {
    if (e) e.preventDefault();

    if (!bypassWarning) {
      // Check if a schedule already exists for this route
      const existingSchedule = schedules.find(s => 
        s.routeName.toLowerCase() === formData.routeName.toLowerCase() && 
        s.id !== editingScheduleId
      );

      if (existingSchedule) {
        setConfirmAssignModal({
          isOpen: true,
          message: `Warning: A schedule already exists for the route "${formData.routeName}". Are you sure you want to add another schedule?`
        });
        return;
      }
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      const url = isEditMode && editingScheduleId ? `/api/schedules/${editingScheduleId}` : '/api/schedules';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ routeName: '', departure: '', arrival: '', busReg: '', driverName: '', conductorName: '', type: 'Daily' });
        setIsEditMode(false);
        setEditingScheduleId(null);
        toast.success(isEditMode ? 'Schedule updated successfully!' : 'Schedule created successfully!');
        fetchSchedules();
      } else {
        toast.error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} schedule`);
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const executeDeleteSchedule = async () => {
    if (!confirmDeleteModal.id) return;
    try {
      const res = await fetch(`/api/schedules/${confirmDeleteModal.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Schedule deleted successfully!');
        fetchSchedules();
      } else {
        toast.error('Failed to delete schedule');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Error deleting schedule');
    } finally {
      setConfirmDeleteModal({ isOpen: false, id: null });
    }
  };

  const handleViewSchedule = (schedule: any) => {
    setSelectedSchedule(schedule);
    setIsViewModalOpen(true);
    setShowOptionsId(null);
  };

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = schedule.routeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          schedule.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          schedule.busReg.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'All Types' || schedule.type === filterType;
    
    // N-Mode Time Filtering (10 PM - 5 AM)
    let matchesNMode = true;
    if (nMode && schedule.departure) {
      // Assuming departure is "HH:mm" 
      const [hours] = schedule.departure.split(':').map(Number);
      matchesNMode = hours >= 22 || hours <= 5;
    }

    return matchesSearch && matchesType && matchesNMode;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Schedule Management</h2>
          <p className="text-slate-500 mt-1">Create and manage daily/weekly timetables.</p>
        </div>
        {userRole !== 'Driver' && (
          <button onClick={() => {
            setFormData({ routeName: '', departure: '', arrival: '', busReg: '', driverName: '', conductorName: '', type: 'Daily' });
            setIsEditMode(false);
            setEditingScheduleId(null);
            setIsModalOpen(true);
          }} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            New Schedule
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 items-center transition-colors">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by route, driver, or bus..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex-1 md:flex-none">
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 flex-1 md:flex-none"
          >
            <option>All Types</option>
            <option>Daily</option>
            <option>Weekly</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
             <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'list' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>List View</button>
             <button onClick={() => setViewMode('calendar')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'calendar' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Calendar View</button>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Showing {filteredSchedules.length} scheduled trips
          </div>
        </div>
        
        {viewMode === 'calendar' ? (
          <div className="p-6 bg-slate-50 dark:bg-slate-900/50">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                <div key={day} className="flex flex-col space-y-3">
                  <div className="font-bold text-slate-700 dark:text-slate-300 text-center pb-2 border-b border-slate-200 dark:border-slate-700">{day}</div>
                  {filteredSchedules.sort((a, b) => a.departure.localeCompare(b.departure)).map(schedule => (
                    (schedule.type === 'Daily' || schedule.type === day) && (
                      <div key={schedule.id + day} onClick={() => handleViewSchedule(schedule)} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-sm relative group">
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">{schedule.departure} - {schedule.arrival || 'N/A'}</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{schedule.routeName}</div>
                        <div className="text-xs text-slate-500 truncate mt-2 flex items-center"><User className="h-3 w-3 mr-1" />{schedule.driverName}</div>
                      </div>
                    )
                  ))}
                </div>
              ))}
            </div>
            {filteredSchedules.length === 0 && (
              <div className="p-12 text-center text-slate-500">
                No schedules found matching your criteria.
              </div>
            )}
          </div>
        ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {filteredSchedules.map((schedule) => (
            <div key={schedule.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded uppercase tracking-wider">{schedule.id}</span>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{schedule.type}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{schedule.routeName}</h3>
                  <div className="flex flex-wrap items-center gap-6 md:gap-8">
                    <div className="flex items-center space-x-4">
                      <div className="text-left md:text-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Departure</p>
                        <p className="text-xl font-black text-slate-900 dark:text-white">{schedule.departure}</p>
                      </div>
                      <div className="text-slate-300 dark:text-slate-600">
                        <ArrowRight className="h-5 w-5" />
                      </div>
                      <div className="text-left md:text-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Arrival</p>
                        <p className="text-xl font-black text-slate-900 dark:text-white">{schedule.arrival || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="hidden md:block h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 mb-1">
                        <User className="h-4 w-4 mr-2 text-blue-500" />
                        <span className="font-medium">Driver: {schedule.driverName}</span>
                      </div>

                      <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                        <BusIcon className="h-4 w-4 mr-2 text-purple-500" />
                        <span className="font-medium">Bus: {schedule.busReg}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button onClick={() => handleViewSchedule(schedule)} className="flex-1 lg:flex-none px-6 py-2.5 bg-slate-900 dark:bg-slate-700 text-white text-sm font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-md active:scale-95">
                    View Details
                  </button>
                  <div className="relative">
                    <button 
                      onClick={() => setShowOptionsId(showOptionsId === schedule.id ? null : schedule.id)}
                      className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-xl transition-all shadow-sm"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                    {showOptionsId === schedule.id && (
                      <div className="absolute right-0 mt-2 w-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-10 overflow-hidden animate-in fade-in zoom-in duration-200 p-1">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditModal(schedule)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {userRole !== 'Driver' && (
                            <button onClick={() => {
                              setConfirmDeleteModal({isOpen: true, id: schedule.id});
                              setShowOptionsId(null);
                            }} className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredSchedules.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              No schedules found matching your criteria.
            </div>
          )}
        </div>
        )}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{isEditMode ? 'Edit Schedule' : 'Create Schedule'}</h3>
              <button type="button" onClick={() => {
                setIsModalOpen(false);
                setIsEditMode(false);
                setEditingScheduleId(null);
                setFormData({ routeName: '', departure: '', arrival: '', busReg: '', driverName: '', conductorName: '', type: 'Daily' });
              }} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmitSchedule} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-2">
                  <div className="mt-0.5"><X className="h-4 w-4" /></div>
                  <p>{errorMsg}</p>
                </div>
              )}
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Route Name</label><input required type="text" name="routeName" value={formData.routeName} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="e.g. Colombo - Kandy" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Departure Time</label><input required type="time" name="departure" value={formData.departure} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Arrival Time</label><input required type="time" name="arrival" value={formData.arrival} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label><select name="type" value={formData.type} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"><option>Daily</option><option>Weekly</option></select></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assigned Bus</label><input required type="text" name="busReg" value={formData.busReg} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="e.g. NB-4521" /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assigned Driver</label><input required type="text" name="driverName" value={formData.driverName} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Driver Name" /></div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => {
                  setIsModalOpen(false);
                  setIsEditMode(false);
                  setEditingScheduleId(null);
                  setFormData({ routeName: '', departure: '', arrival: '', busReg: '', driverName: '', conductorName: '', type: 'Daily' });
                }} className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center">{isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : (isEditMode ? 'Update Schedule' : 'Save Schedule')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {isViewModalOpen && selectedSchedule && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Schedule Details</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 border border-blue-200">
                  <Clock className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white">{selectedSchedule.routeName}</h3>
                  <p className="text-sm text-slate-500">ID: {selectedSchedule.id}</p>
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 space-y-3 border border-slate-100 dark:border-slate-700">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Type</span>
                  <span className="text-sm font-bold text-blue-600">{selectedSchedule.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Departure</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedSchedule.departure}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Arrival</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedSchedule.arrival || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Assigned Bus</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedSchedule.busReg}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Assigned Driver</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedSchedule.driverName}</span>
                </div>

              </div>
              
              <div className="pt-2 flex justify-end">
                <button onClick={() => setIsViewModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDeleteModal.isOpen}
        title="Delete Schedule"
        message="Are you sure you want to delete this schedule?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={executeDeleteSchedule}
        onCancel={() => setConfirmDeleteModal({isOpen: false, id: null})}
      />

      <ConfirmModal
        isOpen={confirmAssignModal.isOpen}
        title="Assign Route Warning"
        message={confirmAssignModal.message}
        confirmText="OK"
        cancelText="Cancel"
        onConfirm={() => {
          setConfirmAssignModal({isOpen: false, message: ''});
          handleSubmitSchedule(undefined, true);
        }}
        onCancel={() => setConfirmAssignModal({isOpen: false, message: ''})}
        isDestructive={false}
      />
    </div>
  );
}
