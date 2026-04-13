import React, { useState, useEffect } from 'react';
import { CheckCircle2, TrendingUp, Calendar, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, parseISO, isBefore, isEqual, startOfDay } from 'date-fns';
import { toast } from 'react-hot-toast';
import { ActivityHeatmap } from '../components/ActivityHeatmap';
import { useAuth } from '../contexts/AuthContext';

export const Dashboard = () => {
  const { user } = useAuth();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const fetchDueProblems = async () => {
    try {
      // Fetch all unfinished problems for the user
      const { data, error } = await supabase
        .from('problems')
        .select('*');

      if (error) throw error;

      if (!data) {
        setProblems([]);
        return;
      }

      // Filter locally for problems due today or earlier
      const today = startOfDay(new Date());
      
      const due = data.filter(problem => {
        // Did we complete it TODAY? Keep it on the dashboard so we can undo it
        if (problem.last_reviewed_date === todayStr) return true;

        if (problem.current_interval_index >= problem.review_schedule.length) return false;
        
        const nextReviewDate = startOfDay(parseISO(problem.review_schedule[problem.current_interval_index]));
        return isBefore(nextReviewDate, today) || isEqual(nextReviewDate, today);
      });

      setProblems(due);
    } catch (error) {
      console.error('Error fetching due problems:', error);
      toast.error('Failed to load your review list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDueProblems();
  }, []);

  const handleMarkReviewed = async (problem) => {
    setReviewingId(problem.id);
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const newIndex = problem.current_interval_index + 1;
      
      const { error } = await supabase
        .from('problems')
        .update({
          current_interval_index: newIndex,
          last_reviewed_date: todayStr
        })
        .eq('id', problem.id);

      if (error) throw error;

      // Silently add a review log for our heatmap schema (ignores if table missing)
      await supabase.from('review_logs').insert([{
        user_id: user.id,
        problem_id: problem.id,
        date_string: todayStr
      }]);

      toast.success(`Marked "${problem.title}" as reviewed!`);
      // Update locally to keep it in the "Completed" section instead of vanishing
      setProblems(prev => prev.map(p => p.id === problem.id ? { ...p, current_interval_index: newIndex, last_reviewed_date: todayStr } : p));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReviewingId(null);
    }
  };

  const handleUndoReview = async (problem) => {
    setReviewingId(problem.id);
    try {
      const newIndex = Math.max(0, problem.current_interval_index - 1);
      
      const { error } = await supabase
        .from('problems')
        .update({
          current_interval_index: newIndex,
          last_reviewed_date: null
        })
        .eq('id', problem.id);

      if (error) throw error;

      // Retroactively scrub the database's log so the heatmap visually decreases immediately
      const { error: logError } = await supabase
        .from('review_logs')
        .delete()
        .eq('user_id', user.id)
        .eq('problem_id', problem.id)
        .eq('date_string', todayStr);
      
      if (logError) throw logError;

      toast.success(`Unchecked "${problem.title}"`);
      // Slide it back mathematically without refreshing DB
      setProblems(prev => prev.map(p => p.id === problem.id ? { ...p, current_interval_index: newIndex, last_reviewed_date: null } : p));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReviewingId(null);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'text-emerald-600 bg-emerald-50';
      case 'Medium': return 'text-amber-600 bg-amber-50';
      case 'Hard': return 'text-rose-600 bg-rose-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const dueList = problems.filter(p => p.last_reviewed_date !== todayStr);
  const completedList = problems.filter(p => p.last_reviewed_date === todayStr);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">Ready to exercise your brain today?</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <div className="flex-1 bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-sm flex items-center space-x-3">
            <div className="bg-slate-50 text-slate-600 p-2 rounded-xl border border-slate-100">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{format(new Date(), 'EEEE, MMM do')}</p>
              <p className="text-xs text-slate-500">Today's Date</p>
            </div>
          </div>
          
          <div className="flex-1 bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-sm flex items-center space-x-3">
            <div className="bg-slate-50 text-slate-600 p-2 rounded-xl border border-slate-100">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{problems.length} Due</p>
              <p className="text-xs text-slate-500">Pending Reviews</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Heatmap & Streak Component */}
      <ActivityHeatmap />

      {/* Revision List */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
          <AlertCircle className="mr-2 text-slate-400" size={20} /> Today's Revision List
        </h2>

        {loading ? (
          <div className="flex justify-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex flex-col items-center justify-center space-y-3">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <p className="text-slate-500 text-sm font-medium">Checking your schedule...</p>
            </div>
          </div>
        ) : dueList.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 mb-5 relative">
              <CheckCircle2 className="text-emerald-500 relative z-10" size={40} />
              <div className="absolute inset-0 bg-emerald-400 opacity-20 rounded-full animate-ping"></div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">You're all caught up!</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              There are no DSA problems scheduled for review today. Take a break!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {dueList.map(problem => (
              <div key={problem.id} className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-bold text-slate-800">{problem.title}</h3>
                    {problem.url && (
                      <a href={problem.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-500 transition-colors">
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${getDifficultyColor(problem.difficulty)}`}>
                      {problem.difficulty}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">
                      Interval: {problem.current_interval_index + 1}
                    </span>
                    {problem.last_reviewed_date && (
                      <span className="text-xs text-slate-500 flex items-center">
                        Last reviewed: {format(parseISO(problem.last_reviewed_date), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full md:w-auto shrink-0 space-y-2 mt-2 md:mt-0">
                  <button
                    onClick={() => handleMarkReviewed(problem)}
                    disabled={reviewingId === problem.id}
                    className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 md:py-2.5 min-h-[44px] rounded-xl font-semibold transition-colors disabled:opacity-70 shadow-sm"
                  >
                    {reviewingId === problem.id ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        <span>Mark as Reviewed</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Today List */}
      {completedList.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
            <CheckCircle2 className="mr-2 text-emerald-500" size={20} /> Completed Today
          </h2>
          <div className="space-y-4 opacity-75 hover:opacity-100 transition-opacity">
            {completedList.map(problem => (
              <div key={problem.id} className="bg-slate-50 p-5 md:p-6 rounded-2xl border border-emerald-100 shadow-sm transition-shadow group flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-bold text-slate-500 line-through decoration-slate-300">{problem.title}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-lg">
                      Done
                    </span>
                    <span className="text-xs text-slate-400">
                      Completed at {format(new Date(), 'h:mm a')}
                    </span>
                  </div>
                </div>
                <div className="w-full md:w-auto shrink-0 mt-2 md:mt-0">
                  <button
                    onClick={() => handleUndoReview(problem)}
                    disabled={reviewingId === problem.id}
                    title="Undo completion"
                    className="w-full flex items-center justify-center space-x-2 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 px-5 py-3 md:py-2.5 min-h-[44px] rounded-xl font-semibold transition-colors disabled:opacity-70 shadow-sm"
                  >
                    {reviewingId === problem.id ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        <AlertCircle size={18} />
                        <span>Undo Match</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
