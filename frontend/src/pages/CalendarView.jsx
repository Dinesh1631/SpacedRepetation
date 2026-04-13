import React, { useState, useEffect, useMemo } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  isToday,
  parseISO
} from 'date-fns';
import { ChevronLeft, ChevronRight, BookOpen, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export const CalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllProblems = async () => {
      try {
        const { data, error } = await supabase.from('problems').select('*');
        if (error) throw error;
        setProblems(data || []);
      } catch (error) {
        toast.error('Failed to fetch calendar data');
      } finally {
        setLoading(false);
      }
    };
    fetchAllProblems();
  }, []);

  // Map out all future schedules
  const scheduleMap = useMemo(() => {
    const map = new Map(); // 'yyyy-MM-dd' -> Problem[]
    
    problems.forEach(problem => {
      if (!problem.review_schedule) return;
      
      // We can map all future scheduled dates that the user has not completed yet
      for (let i = problem.current_interval_index; i < problem.review_schedule.length; i++) {
        const dateStr = problem.review_schedule[i];
        if (!map.has(dateStr)) {
          map.set(dateStr, []);
        }
        // Only push if compiling for the exact mapped visual date
        map.get(dateStr).push({
          ...problem,
          isNextReview: i === problem.current_interval_index // flag to highlight if it's the immediate next one
        });
      }
    });
    
    return map;
  }, [problems]);

  // Calendar setup
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const viewDays = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // Determine tasks for the selected date
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedProblems = scheduleMap.get(selectedDateStr) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Calendar Overview</h1>
        <p className="text-slate-500 mt-1">Visualize your upcoming review load and historical progress.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar Grid */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center space-x-2">
              <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600">
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 text-sm font-medium rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                Today
              </button>
              <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="bg-slate-50 py-2 text-center text-xs font-semibold text-slate-500">
                {day}
              </div>
            ))}

            {viewDays.map((day, idx) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const dailyTasks = scheduleMap.get(dayStr) || [];
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isTodayDate = isToday(day);

              return (
                <div 
                  key={day.toString() + idx}
                  onClick={() => setSelectedDate(day)}
                  className={`bg-white min-h-[100px] p-2 cursor-pointer transition-colors relative group
                    ${!isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : 'text-slate-700'}
                    ${isSelected ? 'ring-2 ring-inset ring-blue-500 bg-blue-50/20' : 'hover:bg-slate-50'}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                      ${isTodayDate ? 'bg-blue-600 text-white shadow-sm' : ''}
                      ${isSelected && !isTodayDate ? 'bg-blue-100 text-blue-700' : ''}
                    `}>
                      {format(day, 'd')}
                    </span>
                    
                    {dailyTasks.length > 0 && (
                      <span className="text-xs font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-md">
                        {dailyTasks.length}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-2 space-y-1">
                    {dailyTasks.slice(0, 3).map((task, i) => (
                      <div key={i} className="text-xs truncate px-1.5 py-1 bg-slate-100 text-slate-600 rounded">
                        {task.title}
                      </div>
                    ))}
                    {dailyTasks.length > 3 && (
                      <div className="text-xs text-slate-400 font-medium px-1">
                        +{dailyTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details */}
        <div className="lg:w-96 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-fit">
          <h3 className="font-bold text-lg text-slate-800 mb-2">
            {isToday(selectedDate) ? "Today's Schedule" : format(selectedDate, 'EEEE, MMMM do')}
          </h3>
          
          <div className="flex-1 mt-4">
            {selectedProblems.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center">
                <div className="bg-slate-50 p-4 rounded-full mb-3">
                  <BookOpen className="text-slate-300" size={32} />
                </div>
                <p className="text-slate-500 font-medium">No reviews scheduled</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                  Take a break or add new problems to keep learning.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedProblems.map((problem, i) => (
                  <div key={i} className="p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-sm text-slate-800 group-hover:text-blue-600 transition-colors">
                        {problem.title}
                      </p>
                      {problem.url && (
                        <a href={problem.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-500">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {problem.difficulty}
                      </span>
                      {problem.isNextReview && (
                        <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
                          Next Up
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
