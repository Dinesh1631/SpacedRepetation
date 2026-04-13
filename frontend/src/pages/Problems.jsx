import React, { useState, useEffect } from 'react';
import { Plus, Search, ExternalLink, Calendar as CalendarIcon, Tag, Clock, NotepadText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AddProblemModal } from '../components/AddProblemModal';
import { NotesModal } from '../components/NotesModal';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const Problems = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNotesProblem, setSelectedNotesProblem] = useState(null);

  const fetchProblems = async () => {
    try {
      const { data, error } = await supabase
        .from('problems')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProblems(data || []);
    } catch (error) {
      console.error('Error fetching problems:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Hard': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredProblems = problems.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.tags && p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Problems</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and organize your DSA questions.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto flex justify-center items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 min-h-[44px] rounded-xl font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span>Add Problem</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex items-center space-x-3">
        <Search className="text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search by title or tag..."
          className="w-full focus:outline-none text-slate-700 placeholder-slate-400"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredProblems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
            <Search className="text-slate-400" size={24} />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-1">No problems found</h3>
          <p className="text-slate-500">Get started by adding your first DSA problem.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProblems.map((problem) => {
            const nextReview = problem.current_interval_index < problem.review_schedule.length
              ? problem.review_schedule[problem.current_interval_index]
              : null;

            return (
              <div key={problem.id} className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-slate-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 flex flex-col h-full">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-lg text-slate-800 flex-1 pr-2 leading-tight" title={problem.title}>
                    {problem.title}
                  </h3>
                  <div className="flex shrink-0 gap-1">
                    <button 
                      onClick={() => setSelectedNotesProblem(problem)}
                      className={`p-2 rounded-lg transition-colors inline-block min-h-[32px] min-w-[32px] flex items-center justify-center ${problem.notes ? 'text-slate-800 bg-slate-100 hover:bg-slate-200' : 'text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-slate-600'}`}
                      title={problem.notes ? "View/Edit Notes" : "Add Notes"}
                    >
                      <NotepadText size={16} />
                    </button>
                    {problem.url && (
                      <a href={problem.url} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 p-2 rounded-lg transition-colors inline-block min-h-[32px] min-w-[32px] flex items-center justify-center">
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`text-xs px-2.5 py-1 rounded-md border font-medium ${getDifficultyColor(problem.difficulty)}`}>
                    {problem.difficulty}
                  </span>
                  {problem.tags?.slice(0, 2).map((tag, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-md font-medium flex items-center gap-1">
                      <Tag size={10} /> {tag}
                    </span>
                  ))}
                  {problem.tags?.length > 2 && (
                    <span className="text-xs px-2 py-1 bg-slate-50 text-slate-500 rounded-md">+{problem.tags.length - 2}</span>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t border-slate-50 mt-auto min-h-0">
                  <div className="flex items-center text-xs text-slate-500">
                    <Clock size={14} className="mr-2 text-slate-400" />
                    <span>Added {formatDistanceToNow(parseISO(problem.created_at))} ago</span>
                  </div>
                  {nextReview && (
                    <div className="flex items-center text-xs text-slate-500">
                      <CalendarIcon size={14} className="mr-2 text-blue-400" />
                      <span>Next review: <strong className="text-slate-700">{format(parseISO(nextReview), 'MMM d, yyyy')}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddProblemModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onProblemAdded={(newProblem) => setProblems([newProblem, ...problems])}
      />

      <NotesModal
        isOpen={!!selectedNotesProblem}
        onClose={() => setSelectedNotesProblem(null)}
        problem={selectedNotesProblem}
        onNotesSaved={(id, newNotes) => {
          setProblems(prev => prev.map(p => p.id === id ? { ...p, notes: newNotes } : p));
        }}
      />
    </div>
  );
};
