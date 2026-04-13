import React, { useState, useEffect } from 'react';
import { CheckCircle2, TrendingUp, Calendar, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, parseISO, isBefore, isEqual, startOfDay } from 'date-fns';
import { toast } from 'react-hot-toast';

export const Dashboard = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);

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

      toast.success(`Marked "${problem.title}" as reviewed!`);
      // Remove it locally
      setProblems(prev => prev.filter(p => p.id !== problem.id));
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

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Ready to exercise your brain today?</p>
        </div>
        
        <div className="flex space-x-3">
          <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-sm flex items-center space-x-3">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{format(new Date(), 'EEEE, MMM do')}</p>
              <p className="text-xs text-slate-500">Today's Date</p>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-sm flex items-center space-x-3">
            <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{problems.length} Due</p>
              <p className="text-xs text-slate-500">Pending Reviews</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revision List */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
          <AlertCircle className="mr-2 text-blue-600" size={20} /> Today's Revision List
        </h2>

        {loading ? (
          <div className="flex justify-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex flex-col items-center justify-center space-y-3">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <p className="text-slate-500 text-sm font-medium">Checking your schedule...</p>
            </div>
          </div>
        ) : problems.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 mb-5 relative">
              <CheckCircle2 className="text-emerald-500 relative z-10" size={40} />
              <div className="absolute inset-0 bg-emerald-400 opacity-20 rounded-full animate-ping"></div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">You're all caught up!</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              There are no DSA problems scheduled for review today. Take a break or add some new problems to learn.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {problems.map(problem => (
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

                <div>
                  <button
                    onClick={() => handleMarkReviewed(problem)}
                    disabled={reviewingId === problem.id}
                    className="w-full md:w-auto flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all disabled:opacity-70 transform hover:-translate-y-0.5 shadow-sm shadow-emerald-500/20"
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
    </div>
  );
};
