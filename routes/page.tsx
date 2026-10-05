"use client";

import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Search, Filter, Navigation, Clock, MoveRight, X, Loader2, Map as MapIcon, Bus, AlertCircle, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import dynamic from 'next/dynamic';
import ConfirmModal from '@/components/ui/ConfirmModal';

// Dynamically import the map so it only renders on client
const RouteMap = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700">
      <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
      <p className="text-slate-500 dark:text-slate-400 font-medium">Loading Map...</p>
    </div>
  )
});



export default function RoutesPage() {

  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', routeNumber: '', start: '', end: '', distance: '', duration: '', stops: [] as string[], departureTime: '', arrivalTime: '' });
  const [duplicateWarning, setDuplicateWarning] = useState<any | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [userRole, setUserRole] = useState<string>('');
  const [depots, setDepots] = useState<any[]>([]);

  const [startPos, setStartPos] = useState<[number, number] | undefined>(undefined);
  const [endPos, setEndPos] = useState<[number, number] | undefined>(undefined);
  const [stopsPos, setStopsPos] = useState<[number, number][]>([]);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);

  // Helper to add delay
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  // Function to Geocode a place name using Nominatim API
  const geocodePlace = async (place: string): Promise<[number, number] | null> => {
    try {
      await delay(1000); // Respect Nominatim's 1 request/sec limit
      const emailParam = "&email=admin@srmss.com";
      const searchPlace = place.toLowerCase().includes('sri lanka') ? place : `${place}, Sri Lanka`;
      const query = encodeURIComponent(searchPlace);
      let res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1${emailParam}`);
      let data = await res.json();
      
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }

      await delay(1000); // Respect limit before fallback
      // Fallback: search without appending Sri Lanka
      const fallbackQuery = encodeURIComponent(place);
      res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${fallbackQuery}&limit=1${emailParam}`);
      data = await res.json();
      
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch (err) {
      console.error(`Error geocoding ${place}:`, err);
    }
    return null;
  };

  const fetchRoutes = async () => {
    try {
      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();
      if (sessionData.authenticated) {
        setUserRole(sessionData.user.role);
        if (sessionData.user.role === 'CentralAdmin') {
          const depotsRes = await fetch('/api/depots');
          const depotsData = await depotsRes.json();
          if (depotsData.depots) setDepots(depotsData.depots);
        }
      }

      const res = await fetch('/api/routes');
      const data = await res.json();
      if (data.routes) {
        setRoutes(data.routes);
        if (data.routes.length > 0 && !selectedRoute) setSelectedRoute(data.routes[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    const updateMapPositions = async () => {
      if (selectedRoute) {
        setStartPos(undefined);
        setEndPos(undefined);
        setStopsPos([]);
        setRouteCoordinates([]);
        
        try {
          const startCoord = await geocodePlace(selectedRoute.startPoint);
          if (startCoord) setStartPos(startCoord);
          
          const endCoord = await geocodePlace(selectedRoute.endPoint);
          if (endCoord) setEndPos(endCoord);
          
          let parsedStops = [];
          if (typeof selectedRoute.stops === 'string') {
            try { parsedStops = JSON.parse(selectedRoute.stops); } catch (e) {}
          } else if (Array.isArray(selectedRoute.stops)) {
            parsedStops = selectedRoute.stops;
          }
          
          const stopsCoords: [number, number][] = [];
          for (const stop of parsedStops) {
            if (typeof stop === 'string' && stop.trim()) {
              const coord = await geocodePlace(stop);
              if (coord) stopsCoords.push(coord);
            }
          }
          setStopsPos(stopsCoords);

          // Get OSRM path if we have start and end
          if (startCoord && endCoord) {
            const allCoords = [startCoord, ...stopsCoords, endCoord];
            const coordsString = allCoords.map(c => `${c[1]},${c[0]}`).join(';');
            const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`);
            const osrmData = await osrmRes.json();
            if (osrmData.code === 'Ok' && osrmData.routes && osrmData.routes.length > 0) {
              const pathCoords = osrmData.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as [number, number]);
              setRouteCoordinates(pathCoords);
            }
          }
        } catch (error) {
          console.error("Error updating map positions:", error);
        }
      }
    };
    updateMapPositions();
  }, [selectedRoute]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddStop = () => {
    setFormData({ ...formData, stops: [...(formData.stops || []), ''] });
  };

  const handleStopChange = (index: number, value: string) => {
    const newStops = [...(formData.stops || [])];
    newStops[index] = value;
    setFormData({ ...formData, stops: newStops });
  };

  const handleRemoveStop = (index: number) => {
    const newStops = [...(formData.stops || [])];
    newStops.splice(index, 1);
    setFormData({ ...formData, stops: newStops });
  };

  const openEditModal = (route: any) => {
    setFormData({
      name: route.name,
      routeNumber: route.routeNumber || '',
      start: route.startPoint,
      end: route.endPoint,
      distance: route.distance,
      duration: route.duration,
      stops: route.stops || [],
      departureTime: route.departureTime || '',
      arrivalTime: route.arrivalTime || ''
    });
    setEditingRouteId(route.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleCalculateDistance = async () => {
    if (!formData.start || !formData.end) {
      toast.error("Please enter Start Point and End Point first.");
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Geocode all points
      const startCoord = await geocodePlace(formData.start);
      const endCoord = await geocodePlace(formData.end);
      
      if (!startCoord || !endCoord) {
        toast.error("Could not find coordinates for the start or end point. Try being more specific.");
        setIsSaving(false);
        return;
      }

      setStartPos(startCoord);
      setEndPos(endCoord);

      const stopsCoords: [number, number][] = [];
      for (const stop of formData.stops) {
        if (stop.trim()) {
          const coord = await geocodePlace(stop);
          if (coord) stopsCoords.push(coord);
        }
      }
      setStopsPos(stopsCoords);

      // Build coordinates string for OSRM: lon,lat;lon,lat...
      const allCoords = [startCoord, ...stopsCoords, endCoord];
      const coordsString = allCoords.map(c => `${c[1]},${c[0]}`).join(';');

      // Fetch route from OSRM
      const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`);
      const osrmData = await osrmRes.json();

      if (osrmData.code === 'Ok' && osrmData.routes && osrmData.routes.length > 0) {
        const route = osrmData.routes[0];
        
        // Calculate Distance and Duration
        const distanceKm = (route.distance / 1000).toFixed(1);
        
        const totalMinutes = Math.round(route.duration / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        setFormData(prev => ({
          ...prev,
          distance: distanceKm,
          duration: durationStr
        }));

        // Extract detailed path coordinates
        // GeoJSON gives [lon, lat], we need [lat, lon] for Leaflet
        const pathCoords = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as [number, number]);
        setRouteCoordinates(pathCoords);
        toast.success("Distance and time calculated successfully!");
      } else {
        toast.error("Could not calculate driving route between these points.");
      }

    } catch (err) {
      console.error('Error calculating distance:', err);
      toast.error('Error calculating route. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitRoute = async (e?: React.FormEvent, bypassWarning = false) => {
    if (e) e.preventDefault();

    if (!isEditMode && !bypassWarning) {
      try {
        const checkRes = await fetch(`/api/routes/check?startPoint=${encodeURIComponent(formData.start)}&endPoint=${encodeURIComponent(formData.end)}`);
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          const existingRoutes = checkData.routes || [];

          if (existingRoutes.length > 0) {
            setDuplicateWarning({
              count: existingRoutes.length,
              routes: existingRoutes,
              start: formData.start,
              end: formData.end
            });
            return; // Stop the flow and show modal
          }
        }
      } catch (err) {
        console.error('Error checking global routes:', err);
      }
    }

    setIsSaving(true);
    try {
      const url = isEditMode && editingRouteId ? `/api/routes/${editingRouteId}` : '/api/routes';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ name: '', routeNumber: '', start: '', end: '', distance: '', duration: '', stops: [], departureTime: '', arrivalTime: '' });
        setIsEditMode(false);
        setEditingRouteId(null);
        fetchRoutes();
        if (isEditMode && selectedRoute?.id === editingRouteId) {
          setSelectedRoute({ 
            ...selectedRoute, 
            name: formData.name,
            routeNumber: formData.routeNumber,
            startPoint: formData.start,
            endPoint: formData.end,
            distance: formData.distance,
            duration: formData.duration,
            stops: formData.stops,
            departureTime: formData.departureTime,
            arrivalTime: formData.arrivalTime
          });
        }
        toast.success(isEditMode ? 'Route updated successfully!' : 'Route created successfully!');
      } else {
        toast.error(`Failed to ${isEditMode ? 'update' : 'create'} route`);
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred while saving the route');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (routeId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Closed' : 'Active';
    try {
      const res = await fetch(`/api/routes/${routeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchRoutes();
        if (selectedRoute?.id === routeId) {
          setSelectedRoute({ ...selectedRoute, status: newStatus });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const executeDeleteRoute = async () => {
    if (!confirmModal.id) return;
    try {
      const res = await fetch(`/api/routes/${confirmModal.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Route deleted successfully!');
        fetchRoutes();
        if (selectedRoute?.id === confirmModal.id) {
          setSelectedRoute(null);
        }
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete route');
      }
    } catch (error) {
      console.error('Error deleting route:', error);
      toast.error('Error deleting route');
    } finally {
      setConfirmModal({ isOpen: false, id: null });
    }
  };

  const filteredRoutes = routes.filter(route => {
    const matchesSearch = route.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          route.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          route.startPoint?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          route.endPoint?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All Status' || (route.status || 'Active') === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const origin = selectedRoute?.startPoint;
  const destination = selectedRoute?.endPoint;
  const waypoints = selectedRoute?.stops || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Route Planning</h2>
          <p className="text-slate-500 mt-1">Design routes, set stops, and calculate distances.</p>
        </div>
        {!['Driver'].includes(userRole) && (
          <button onClick={() => {
            setFormData({ name: '', routeNumber: '', start: '', end: '', distance: '', duration: '', stops: [], departureTime: '', arrivalTime: '', depotId: depots.length > 0 ? depots[0].id : '' } as any);
            setIsEditMode(false);
            setEditingRouteId(null);
            setIsModalOpen(true);
          }} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Create New Route
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 items-center transition-colors">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by route name, start or end location..."
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
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 flex-1 md:flex-none"
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Closed</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-4">
          <div className="space-y-3 h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {filteredRoutes.map((route) => (
              <div 
                key={route.id} 
                onClick={() => setSelectedRoute(route)}
                className={`bg-white dark:bg-slate-800 p-5 rounded-2xl border shadow-sm transition-all cursor-pointer group ${selectedRoute?.id === route.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    {route.routeNumber && (
                      <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md uppercase tracking-wider">Route {route.routeNumber}</span>
                    )}
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-md uppercase tracking-wider">{route.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${(route.status || 'Active') === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {route.status || 'Active'}
                    </span>
                    <div className="flex items-center text-xs text-slate-400">
                      <Clock className="h-3 w-3 mr-1" />
                      {route.duration}
                    </div>
                  </div>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-4 group-hover:text-blue-600 transition-colors">{route.name}</h3>
                <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 space-x-2">
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 my-1"></div>
                    <div className="h-2 w-2 rounded-full border-2 border-blue-500 bg-white dark:bg-slate-800"></div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <p className="truncate font-medium text-slate-900 dark:text-white">{route.startPoint}</p>
                    {route.stops && route.stops.length > 0 && (
                      <p className="text-xs text-slate-500 font-medium italic">+{route.stops.length} stops</p>
                    )}
                    <p className="truncate font-medium text-slate-900 dark:text-white">{route.endPoint}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase">Distance</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{route.distance}</p>
                  </div>
                </div>
                
                {route.assignedBuses && route.assignedBuses.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center flex-wrap gap-2">
                    <Bus className="h-3 w-3 text-slate-400" />
                    {route.assignedBuses.map((bus: string) => (
                      <span key={bus} className="text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md">
                        {bus}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {filteredRoutes.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No routes match your search.
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 min-h-[500px] h-[600px] bg-slate-100 dark:bg-slate-800 rounded-3xl overflow-hidden shadow-inner relative flex flex-col items-center justify-center">
           {routes.length === 0 ? (
             <div className="text-center p-8">
               <div className="h-20 w-20 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-lg mb-4 mx-auto text-blue-500">
                 <MapIcon className="h-10 w-10" />
               </div>
               <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Routes Available</h3>
               <p className="text-slate-500 max-w-sm">Create a route to see it mapped out.</p>
             </div>
           ) : (
             <>
               {selectedRoute && (
                 <div className="absolute top-4 right-4 z-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 max-w-sm w-72 transition-all">
                   <h4 className="font-bold text-slate-900 dark:text-white mb-1">{selectedRoute.name} {selectedRoute.routeNumber && <span className="text-sm font-normal text-slate-500">({selectedRoute.routeNumber})</span>}</h4>
                   <div className="flex items-center justify-between mb-4">
                     <span className="text-sm text-slate-500">Status: <span className={`font-bold ${selectedRoute.status === 'Closed' ? 'text-red-600' : 'text-green-600'}`}>{selectedRoute.status || 'Active'}</span></span>
                   </div>
                   
                   {selectedRoute.status === 'Closed' && (
                     <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-start gap-2 text-sm mb-4">
                       <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                       <p className="leading-snug">This route is closed. Buses cannot be assigned to this route anymore.</p>
                     </div>
                   )}
                   
                   {!['Driver'].includes(userRole) && (
                     <div className="flex flex-col gap-2">
                       <button 
                         onClick={() => openEditModal(selectedRoute)}
                         className="w-full py-2 px-4 rounded-xl text-sm font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all shadow-sm flex items-center justify-center gap-2"
                       >
                         <Edit2 className="h-4 w-4" /> Edit Route
                       </button>
                       <button 
                         onClick={() => handleToggleStatus(selectedRoute.id, selectedRoute.status || 'Active')}
                         className={`w-full py-2 px-4 rounded-xl text-sm font-bold transition-all shadow-sm ${selectedRoute.status !== 'Closed' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                       >
                         {selectedRoute.status !== 'Closed' ? 'Close Route' : 'Re-open Route'}
                       </button>
                       <button 
                         onClick={() => setConfirmModal({isOpen: true, id: selectedRoute.id})}
                         className="w-full py-2 px-4 rounded-xl text-sm font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all shadow-sm flex items-center justify-center gap-2"
                       >
                         <Trash2 className="h-4 w-4" /> Delete Route
                       </button>
                     </div>
                   )}
                 </div>
               )}
               <RouteMap 
                 startPos={startPos} 
                 endPos={endPos} 
                 stops={stopsPos}
                 routeCoordinates={routeCoordinates}
                 routeName={selectedRoute?.name || formData.name} 
               />
             </>
           )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{isEditMode ? 'Edit Route' : 'Create New Route'}</h3>
              <button type="button" onClick={() => {
                setIsModalOpen(false);
                setIsEditMode(false);
                setEditingRouteId(null);
                setFormData({ name: '', routeNumber: '', start: '', end: '', distance: '', duration: '', stops: [], departureTime: '', arrivalTime: '', depotId: '' } as any);
              }} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmitRoute} className="p-6 space-y-4">
              {userRole === 'CentralAdmin' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assign to Depot</label>
                  <select required name="depotId" value={(formData as any).depotId || ''} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none">
                    <option value="" disabled>Select a Depot</option>
                    {depots.map(depot => (
                      <option key={depot.id} value={depot.id}>{depot.name} ({depot.code})</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Route Name</label><input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="e.g. Colombo - Kandy" /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Route Number</label><input type="text" name="routeNumber" value={formData.routeNumber} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="e.g. 48" /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Point</label><input required type="text" name="start" value={formData.start} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="e.g. Colombo Fort" /></div>
              
              {/* Intermediary Stops */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Intermediary Stops</label>
                  <button type="button" onClick={handleAddStop} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center">
                    <Plus className="h-3 w-3 mr-1" /> Add Stop
                  </button>
                </div>
                {(formData.stops || []).map((stop, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input 
                      required 
                      type="text" 
                      value={stop} 
                      onChange={(e) => handleStopChange(index, e.target.value)} 
                      className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl text-sm outline-none" 
                      placeholder={`Stop ${index + 1}`} 
                    />
                    <button type="button" onClick={() => handleRemoveStop(index)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Point</label><input required type="text" name="end" value={formData.end} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="e.g. Kandy Goods Shed" /></div>
              
              <div className="flex justify-end">
                <button type="button" onClick={handleCalculateDistance} disabled={isSaving} className="px-4 py-2 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg shadow-sm flex items-center">
                  {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Navigation className="h-3 w-3 mr-1" />}
                  Auto-Calculate Distance & Time
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Distance (km)</label><input required type="text" name="distance" value={formData.distance} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="115 km" /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Est. Duration</label><input required type="text" name="duration" value={formData.duration} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="3h 30m" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Departure Time</label><input type="time" name="departureTime" value={formData.departureTime} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Arrival Time</label><input type="time" name="arrivalTime" value={formData.arrivalTime} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" /></div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => {
                  setIsModalOpen(false);
                  setIsEditMode(false);
                  setEditingRouteId(null);
                  setFormData({ name: '', routeNumber: '', start: '', end: '', distance: '', duration: '', stops: [], departureTime: '', arrivalTime: '', depotId: '' } as any);
                }} className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center">{isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : (isEditMode ? 'Update Route' : 'Save Route')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate Warning Modal */}
      {duplicateWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-rose-50 dark:bg-rose-900/30 p-6 border-b border-rose-100 dark:border-rose-800/50 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/50 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-xl font-black text-rose-700 dark:text-rose-400">Route Collision Warning</h3>
              <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm font-medium">
                There {duplicateWarning.count === 1 ? 'is' : 'are'} already <span className="font-bold text-rose-600 dark:text-rose-400">{duplicateWarning.count} route(s)</span> between <span className="font-bold">"{duplicateWarning.start}"</span> and <span className="font-bold">"{duplicateWarning.end}"</span>.
              </p>
            </div>
            
            <div className="p-6">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Existing Routes:</p>
              <div className="max-h-40 overflow-y-auto space-y-2 mb-6 pr-2">
                {duplicateWarning.routes.map((r: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{r.name}</span>
                    <span className="text-xs font-medium text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-md">{r.depotName} Depot</span>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setDuplicateWarning(null)} 
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setDuplicateWarning(null);
                    handleSubmitRoute(undefined, true);
                  }} 
                  className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-rose-200 dark:shadow-none"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Delete Route"
        message="Are you sure you want to delete this route? This will also delete any associated schedules and trips permanently."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={executeDeleteRoute}
        onCancel={() => setConfirmModal({isOpen: false, id: null})}
      />
    </div>
  );
}
