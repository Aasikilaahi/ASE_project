"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, MapPin, Bus, Calendar, Fuel, Wrench, AlertTriangle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DriverDashboardPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        
        if (!sessionData.authenticated || sessionData.user.role !== 'Driver') {
          router.push('/login');
          return;
        }

        const res = await fetch('/api/driver/schedules');
        const data = await res.json();
        if (data.schedules) {
          setSchedules(data.schedules);
        }
      } catch (err) {
        console.error('Error fetching driver schedules:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedules();
  }, [router]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl shadow-xl shadow-blue-900/20 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">Driver Portal</h1>
          <p className="text-blue-100 text-lg">Welcome back! View your assigned routes and log updates.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/fuel" className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-sm hover:shadow-lg transition-all flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600">
              <Fuel className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">Log Fuel</h3>
              <p className="text-slate-500 text-sm">Upload fuel receipts and usage</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link href="/maintenance" className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm hover:shadow-lg transition-all flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600">
              <Wrench className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">Log Maintenance</h3>
              <p className="text-slate-500 text-sm">Report repairs and maintenance</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-500" />
            Your Assigned Schedules
          </h2>
        </div>
        
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            Loading your schedules...
          </div>
        ) : schedules.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider">
                        {schedule.busReg}
                      </span>
                      <span className="text-slate-500 text-sm font-medium">{schedule.days}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{schedule.route}</h3>
                    
                    <div className="flex items-center space-x-8">
                      <div className="flex items-center text-emerald-600">
                        <MapPin className="h-4 w-4 mr-1.5" />
                        <span className="text-sm font-bold">{schedule.startPoint}</span>
                      </div>
                      <div className="h-px w-8 bg-slate-300 dark:bg-slate-600"></div>
                      <div className="flex items-center text-indigo-600">
                        <MapPin className="h-4 w-4 mr-1.5" />
                        <span className="text-sm font-bold">{schedule.endPoint}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div className="text-center">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center justify-center">
                        <Clock className="h-3 w-3 mr-1" /> Departure
                      </p>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{schedule.departure}</p>
                    </div>
                    <div className="h-10 w-px bg-slate-200 dark:bg-slate-700"></div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center justify-center">
                        <Clock className="h-3 w-3 mr-1" /> Arrival
                      </p>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{schedule.arrival}</p>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No Schedules Assigned</h3>
            <p className="text-slate-500 max-w-sm">You do not have any active route schedules assigned at the moment. Contact your Depot Admin.</p>
          </div>
        )}
      </div>
    </div>
  );
}
