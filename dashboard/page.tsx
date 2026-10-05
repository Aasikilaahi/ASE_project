"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bus,
  Users,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Fuel,
  Wrench,
  Download,
  Plus,
  X,
  Loader2,
  Bell,
  Edit2,
  Trash2,
  Building2
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useApp } from '@/context/LanguageContext';
import { toast } from 'react-hot-toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const { nMode, notifications } = useApp();
  const router = useRouter();
  const [stats, setStats] = useState([
    { label: 'Active Trips', value: '...', icon: Bus, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Available Drivers', value: '...', icon: Users, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Total Routes', value: '...', icon: MapPin, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { label: 'Completion Rate', value: '...', icon: CheckCircle2, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  ]);

  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [depotsSummary, setDepotsSummary] = useState<any[]>([]);
  const [vehicleStatus, setVehicleStatus] = useState<any[]>([]);
  const [fuelData, setFuelData] = useState<any[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<any>({ completedTrips: 0, utilization: 0, newDrivers: 0 });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [formData, setFormData] = useState({
    route: '',
    bus: '',
    driver: '',
    departure: '',
    arrival: '',
    status: 'Scheduled',
    revenue: ''
  });

  const fetchData = async () => {
    try {
      // Fetch Role
      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();
      if (sessionData.authenticated) {
        if (sessionData.user.role === 'Driver') {
          router.push('/driver-dashboard');
          return;
        }
        setUserRole(sessionData.user.role);
      }

      // Fetch Stats
      const statsRes = await fetch('/api/stats');
      const statsData = await statsRes.json();
      setStats([
        { label: 'Active Trips', value: statsData.activeTrips.toString(), icon: Bus, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { label: 'Available Drivers', value: statsData.drivers.toString(), icon: Users, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
        { label: 'Total Routes', value: statsData.routes.toString(), icon: MapPin, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
        { label: 'Total Revenue', value: `Rs. ${statsData.totalRevenue?.toLocaleString() || '0'}`, icon: TrendingUp, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
      ]);
      
      if (statsData.depotsSummary) {
        setDepotsSummary(statsData.depotsSummary);
      }
      if (statsData.vehicleStatus) setVehicleStatus(statsData.vehicleStatus);
      if (statsData.fuelData) setFuelData(statsData.fuelData);
      if (statsData.weeklySummary) setWeeklySummary(statsData.weeklySummary);
      if (statsData.alerts) setAlerts(statsData.alerts);

      // Fetch Trips
      const tripsRes = await fetch('/api/trips');
      const tripsData = await tripsRes.json();
      if (tripsData.trips) {
        setActiveTrips(tripsData.trips);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportReport = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('SRMSS Depot Operations Report', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    // Stats Section
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Current Statistics', 14, 45);
    
    autoTable(doc, {
      startY: 50,
      head: [['Metric', 'Value']],
      body: stats.map(s => [s.label, s.value]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Trips Section
    // @ts-ignore
    const finalY = doc.lastAutoTable?.finalY || 50;
    doc.setFontSize(14);
    doc.text('Active Trips', 14, finalY + 15);

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Trip ID', 'Route', 'Bus', 'Driver', 'Status', 'Revenue', 'Departure', 'Arrival']],
      body: activeTrips.map(t => [t.id, t.route, t.bus, t.driver, t.status, `Rs. ${t.revenue || 0}`, t.departure, t.arrival]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save('SRMSS_Dashboard_Report.pdf');
  };

  const handleFirebaseSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/firebase-sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('All tables successfully synced to Firebase Cloud!');
      } else {
        toast.error(`Sync failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Firebase sync error:', error);
      toast.error('Failed to sync to Firebase');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const executeDeleteTrip = async () => {
    if (!confirmModal.id) return;
    try {
      const res = await fetch(`/api/trips/${confirmModal.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Trip deleted successfully!');
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(`Failed to delete trip: ${errData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast.error('Failed to delete trip');
    } finally {
      setConfirmModal({ isOpen: false, id: null });
    }
  };

  const openEditModal = (trip: any) => {
    setFormData({
      route: trip.route,
      bus: trip.bus,
      driver: trip.driver,
      departure: trip.departure || '',
      arrival: trip.arrival || '',
      status: trip.status || 'Scheduled',
      revenue: trip.revenue || ''
    });
    setEditingTripId(trip.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleSubmitTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const url = isEditMode && editingTripId ? `/api/trips/${editingTripId}` : '/api/trips';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ route: '', bus: '', driver: '', departure: '', arrival: '', status: 'Scheduled', revenue: '' });
        setIsEditMode(false);
        setEditingTripId(null);
        toast.success(isEditMode ? 'Trip updated successfully!' : 'Trip created successfully!');
        fetchData(); // Refresh data
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(`Failed to ${isEditMode ? 'update' : 'create'} trip: ${errData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      {nMode && (
        <div className="bg-rose-500 text-white px-6 py-3 rounded-2xl shadow-lg shadow-rose-200 dark:shadow-rose-900/20 flex items-center justify-center animate-pulse">
          <AlertTriangle className="h-5 w-5 mr-3" />
          <span className="font-black uppercase tracking-wider text-sm">⚠️ Emergency/Night Operations Active (N-Mode)</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Depot Overview</h2>
          <p className="text-slate-500 mt-1">Real-time status of the depot operations.</p>
        </div>
        <div className="flex items-center space-x-3">
          {!['Driver'].includes(userRole) && (
            <button 
              onClick={handleExportReport}
              className="flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
            >
              <Download className="w-4 h-4 mr-2 text-slate-500" />
              Export Report
            </button>
          )}
          {userRole !== 'Driver' && (
            <button 
              onClick={() => {
                setFormData({ route: '', bus: '', driver: '', departure: '', arrival: '', status: 'Scheduled', revenue: '' });
                setIsEditMode(false);
                setEditingTripId(null);
                setIsModalOpen(true);
              }}
              className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-all shadow-sm shadow-blue-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Trip
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className={`${stat.bg} p-3 rounded-xl transition-colors`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <span className="text-emerald-500 text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12%
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">{stat.label}</h3>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Trips Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center">
              <Clock className="h-5 w-5 mr-2 text-blue-500" />
              Active Trips
            </h3>
            <Link href="/schedules" className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Trip ID</th>
                  <th className="px-6 py-4 font-semibold">Route</th>
                  <th className="px-6 py-4 font-semibold">Bus / Driver</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Revenue</th>
                  <th className="px-6 py-4 font-semibold">Departure</th>
                  <th className="px-6 py-4 font-semibold">Arrival</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {activeTrips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{trip.id}</td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white font-medium">{trip.route}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900 dark:text-white font-medium">{trip.bus}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{trip.driver}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${trip.status === 'On-time' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                        {trip.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-amber-600 dark:text-amber-500">Rs. {trip.revenue || 0}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{trip.departure}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{trip.arrival}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEditModal(trip)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {userRole !== 'Driver' && (
                          <button onClick={() => setConfirmModal({isOpen: true, id: trip.id})} className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Operational Status / Alerts */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-rose-500" />
                Critical Alerts
              </h3>
              {notifications && <Link href="/maintenance" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">View Logs</Link>}
            </div>
            
            {alerts.length > 0 ? (
              <div className="space-y-4">
                {alerts.map((alert: any, idx: number) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-900/30">
                    <Wrench className="h-5 w-5 text-rose-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-rose-900 dark:text-rose-400">{alert.title}</p>
                      <p className="text-xs text-rose-700 dark:text-rose-500">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 dark:text-emerald-500 mb-2" />
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No Critical Alerts</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Everything is operating smoothly right now.</p>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-lg shadow-blue-200">
            <h3 className="font-bold mb-2">Weekly Summary</h3>
            <p className="text-blue-100 text-sm mb-4">You've completed {weeklySummary.completedTrips} trips this week.</p>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-2xl font-bold">{weeklySummary.utilization}%</p>
                <p className="text-[10px] uppercase opacity-80">Utilization</p>
              </div>
              <div className="h-10 w-px bg-white/20"></div>
              <div className="text-center">
                <p className="text-2xl font-bold">{weeklySummary.newDrivers}</p>
                <p className="text-[10px] uppercase opacity-80">New Drivers</p>
              </div>
              <div className="h-10 w-px bg-white/20"></div>
              <div className="text-center">
                <p className="text-2xl font-bold">{weeklySummary.completedTrips}</p>
                <p className="text-[10px] uppercase opacity-80">Trips Done</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Depots Summary Section for Central Admin */}
      {userRole === 'CentralAdmin' && depotsSummary.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors mb-8">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center">
              <Building2 className="h-5 w-5 mr-2 text-indigo-500" />
              Regional Depots Overview
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Depot Name</th>
                  <th className="px-6 py-4 font-semibold">Location</th>
                  <th className="px-6 py-4 font-semibold text-center">Assigned Buses</th>
                  <th className="px-6 py-4 font-semibold text-center">Available Drivers</th>
                  <th className="px-6 py-4 font-semibold text-center">Active Routes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {depotsSummary.map((depot) => (
                  <tr key={depot.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{depot.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{depot.location}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {depot.vehicleCount} Buses
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {depot.driverCount} Drivers
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-slate-700 dark:text-slate-300">
                      {depot.routeCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Fuel vs Trips Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors group hover:shadow-md">
          <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-indigo-500" />
            Weekly Activity Analysis
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fuelData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                  cursor={{ fill: 'transparent' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="trips" name="Total Trips" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={30} />
                <Bar dataKey="fuel" name="Fuel Usage (100L)" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vehicle Status Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors group hover:shadow-md">
          <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center">
            <Bus className="h-5 w-5 mr-2 text-emerald-500" />
            Fleet Health Status
          </h3>
          <div className="h-72 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vehicleStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {vehicleStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity outline-none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-slate-600 dark:text-slate-300 font-medium ml-1">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text for Donut Chart */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
              <span className="text-3xl font-black text-slate-900 dark:text-white">2</span>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Vehicles</span>
            </div>
          </div>
        </div>
      </div>

      {/* Create Trip Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{isEditMode ? 'Edit Trip' : 'Schedule New Trip'}</h3>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setIsEditMode(false);
                  setEditingTripId(null);
                  setFormData({ route: '', bus: '', driver: '', departure: '', arrival: '', status: 'Scheduled', revenue: '' });
                }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitTrip} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Route</label>
                <input required type="text" name="route" value={formData.route} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="e.g. Colombo - Kandy" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bus Reg No.</label>
                  <input required type="text" name="bus" value={formData.bus} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="NB-4521" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Departure (Time)</label>
                  <input required type="time" name="departure" value={formData.departure} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Arrival (Time)</label>
                  <input required type="time" name="arrival" value={formData.arrival} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assigned Driver</label>
                <input required type="text" name="driver" value={formData.driver} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="Sunil Perera" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Trip Revenue (Rs.)</label>
                <input type="number" name="revenue" value={formData.revenue} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="0.00" />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditMode(false);
                    setEditingTripId(null);
                    setFormData({ route: '', bus: '', driver: '', departure: '', arrival: '', status: 'Scheduled', revenue: '' });
                  }}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-200 disabled:opacity-70 flex items-center"
                >
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isSaving ? (isEditMode ? 'Updating...' : 'Scheduling...') : (isEditMode ? 'Update Trip' : 'Create Trip')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Delete Trip"
        message="Are you sure you want to delete this trip? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={executeDeleteTrip}
        onCancel={() => setConfirmModal({isOpen: false, id: null})}
      />
    </div>
  );
}
