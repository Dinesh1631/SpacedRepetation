import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export const NotesModal = ({ isOpen, onClose, problem, onNotesSaved }) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (problem) {
      setNotes(problem.notes || '');
    }
  }, [problem, isOpen]);

  if (!isOpen || !problem) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('problems')
        .update({ notes })
        .eq('id', problem.id);

      if (error) throw error;
      
      toast.success('Notes saved successfully!');
      onNotesSaved(problem.id, notes);
      onClose();
    } catch (err) {
      toast.error('Failed to save notes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full sm:max-w-md shadow-2xl relative my-auto shrink-0 flex flex-col max-h-[90vh]">
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-start mb-6">
            <div className="pr-4">
              <h2 className="text-xl font-bold text-slate-900">Personal Notes</h2>
              <p className="text-sm text-slate-500 mt-1 line-clamp-1">{problem.title}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 min-h-[150px] flex flex-col">
            <textarea
              autoFocus
              className="w-full flex-1 p-4 text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="Write down logic, complexity, tricky edge cases, or your thought process..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-3 min-h-[44px] text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors text-center"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full sm:w-auto justify-center px-4 py-3 min-h-[44px] text-white bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition-colors disabled:opacity-70 flex items-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{loading ? 'Saving...' : 'Save Notes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
