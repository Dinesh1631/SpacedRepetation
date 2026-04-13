import React, { useState } from 'react';
import { X } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export const AddProblemModal = ({ isOpen, onClose, onProblemAdded }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    difficulty: 'Medium',
    tags: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create Review Schedule
      const today = new Date();
      // Base intervals: 1, 3, 7, 15, 30, 60
      let intervals = [1, 3, 7, 15, 30, 60];
      
      // Bonus: Adjust based on difficulty
      if (formData.difficulty === 'Hard') {
        intervals = [1, 2, 5, 10, 20, 45]; // More frequent
      } else if (formData.difficulty === 'Easy') {
        intervals = [2, 5, 10, 20, 40, 90]; // Less frequent
      }

      const review_schedule = intervals.map(days => format(addDays(today, days), 'yyyy-MM-dd'));

      // Process tags
      const tagsArray = formData.tags.split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const { data, error } = await supabase.from('problems').insert([
        {
          user_id: user.id,
          title: formData.title,
          url: formData.url,
          difficulty: formData.difficulty,
          tags: tagsArray,
          review_schedule,
          current_interval_index: 0,
          created_at: new Date().toISOString()
        }
      ]).select();

      if (error) throw error;

      toast.success('Problem added successfully!');
      onProblemAdded(data[0]);
      setFormData({ title: '', url: '', difficulty: 'Medium', tags: '' });
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900">Add New Problem</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Problem Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Two Sum"
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Problem URL (optional)</label>
            <input
              type="url"
              placeholder="e.g. https://leetcode.com/problems/two-sum/"
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={formData.url}
              onChange={(e) => setFormData({...formData, url: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
            <select
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              value={formData.difficulty}
              onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma separated)</label>
            <input
              type="text"
              placeholder="e.g. Array, Hash Table"
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
            />
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition-colors disabled:opacity-70 flex items-center"
            >
              {loading ? 'Adding...' : 'Add Problem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
