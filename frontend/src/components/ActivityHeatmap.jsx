import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, subDays, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth } from 'date-fns';
import { Flame, Activity } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const ActivityHeatmap = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data, error } = await supabase
          .from('review_logs')
          .select('*')
          .order('date_string', { ascending: false });

        if (error) throw error;
        
        setLogs(data || []);
      } catch (err) {
        toast.error('Heatmap Fetch Error: ' + err.message);
        console.warn('Failed to load activity heatmap:', err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchLogs();
  }, [user]);

  const { streak, heatmapData } = useMemo(() => {
    // 1. Group logs by date
    const dateCounts = new Map();
    logs.forEach(log => {
      // Postgres sometimes returns DATE as 'yyyy-MM-ddT00:00:00Z'
      // Taking substring(0,10) forces exact matches with our frontend format
      const dateStr = log.date_string ? log.date_string.substring(0, 10) : '';
      if (dateStr) {
         dateCounts.set(dateStr, (dateCounts.get(dateStr) || 0) + 1);
      }
    });

    // 2. Calculate Streak
    let currentStreak = 0;
    const today = new Date();

    // Check if they reviewed today or yesterday to start the streak
    if (dateCounts.has(format(today, 'yyyy-MM-dd'))) {
      currentStreak = 1;
    } else if (dateCounts.has(format(subDays(today, 1), 'yyyy-MM-dd'))) {
      currentStreak = 1;
      // Start counting from yesterday
    }

    if (currentStreak > 0) {
      // Walk backwards
      let checkDate = subDays(today, currentStreak === 1 && !dateCounts.has(format(today, 'yyyy-MM-dd')) ? 1 : 0);

      while (true) {
        const nextPrev = subDays(checkDate, 1);
        const dateStr = format(nextPrev, 'yyyy-MM-dd');
        if (dateCounts.has(dateStr)) {
          currentStreak++;
          checkDate = nextPrev;
        } else {
          break;
        }
      }
    }

    // 3. Generate Week-aligned Heatmap Grid (~5 months)
    const endDate = endOfWeek(today);
    const startDate = startOfWeek(subMonths(today, 5));
    
    // Get exactly all days from start of the first week to end of the last week
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    const data = allDays.map(d => {
      const str = format(d, 'yyyy-MM-dd');
      return {
        date: d,
        count: dateCounts.get(str) || 0,
        str
      };
    });

    return { streak: currentStreak, heatmapData: data };
  }, [logs]);

  const getColorClass = (count) => {
    if (count === 0) return 'bg-slate-100 hover:bg-slate-200';
    if (count <= 2) return 'bg-emerald-200 hover:bg-emerald-300';
    if (count <= 4) return 'bg-emerald-400 hover:bg-emerald-500';
    if (count <= 6) return 'bg-emerald-500 hover:bg-emerald-600';
    return 'bg-emerald-600 hover:bg-emerald-700';
  };

  if (loading) {
    return <div className="h-48 bg-white md:p-6 p-4 rounded-2xl border border-slate-100 shadow-sm animate-pulse mb-6" />;
  }

  // Group heatmapData by weeks (each column has exactly 7 days: Sun-Sat)
  const weeks = [];
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7));
  }

  // To draw month labels, we'll keep track of when months change
  const monthLabels = [];
  weeks.forEach((week, index) => {
    // Only place a label if it's the first week of the month, or if the month changed from the prior week
    if (index === 0) {
      monthLabels.push({ label: format(week[0].date, 'MMM'), index });
    } else {
      const prevWeek = weeks[index - 1];
      if (!isSameMonth(week[0].date, prevWeek[0].date)) {
         monthLabels.push({ label: format(week[0].date, 'MMM'), index });
      }
    }
  });

  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm mb-6 flex flex-col md:flex-row gap-6">

      {/* Streak Section */}
      <div className="flex flex-col items-center justify-center bg-gradient-to-b from-orange-50 to-orange-100/50 p-6 rounded-xl border border-orange-100 md:w-48 text-center shrink-0">
        <div className={`p-3 rounded-full mb-2 ${streak > 0 ? 'bg-orange-100 text-orange-500' : 'bg-slate-100 text-slate-400'}`}>
          <Flame size={28} className={streak > 0 ? 'animate-pulse' : ''} />
        </div>
        <p className="text-3xl font-black text-slate-800">{streak}</p>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">Day Streak</p>
      </div>

      {/* Heatmap Section */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-4">
          <Activity size={18} className="text-slate-400" />
          <h3 className="font-bold text-slate-800">Learning Activity (Logs: {logs.length})</h3>
        </div>

        {/* Overflow container for mobile */}
        <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
          <div className="w-max">
            {/* Month Labels */}
            <div className="flex relative h-5 text-xs text-slate-400 font-medium mb-1">
              {monthLabels.map((item, i) => (
                <div 
                  key={i} 
                  className="absolute" 
                  style={{ left: `${item.index * (14 + 6)}px` }} // 14px width + 6px gap = 20px per col
                >
                  {item.label}
                </div>
              ))}
            </div>

            {/* Grid Container */}
            <div className="flex gap-1.5">
              {weeks.map((week, idx) => (
                <div key={idx} className="flex flex-col gap-1.5">
                  {week.map((day) => (
                    <div
                      key={day.str}
                      title={`${day.count} reviews on ${format(day.date, 'MMM d, yyyy')}`}
                      className={`w-3.5 h-3.5 rounded-sm transition-colors duration-200 ${getColorClass(day.count)} cursor-pointer`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center gap-2 mt-3 text-[10px] uppercase font-bold text-slate-400">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-slate-100" />
            <div className="w-3 h-3 rounded-sm bg-emerald-200" />
            <div className="w-3 h-3 rounded-sm bg-emerald-400" />
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <div className="w-3 h-3 rounded-sm bg-emerald-600" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
};
