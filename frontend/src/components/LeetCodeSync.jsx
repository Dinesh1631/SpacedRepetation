import React, { useState, useEffect } from 'react';
import { RefreshCw, Loader2, CheckCircle2, AlertCircle, Link2 } from 'lucide-react';
import { fetchRecentAC, filterTodaySubmissions, deduplicateBySlug } from '../lib/leetcodeService';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { addDays, format } from 'date-fns';
import { toast } from 'react-hot-toast';

const LC_USERNAME_KEY = 'lc_username';

export const LeetCodeSync = ({ onSynced }) => {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState(null); // { imported: number, skipped: number } | null

  // Load saved username on mount
  useEffect(() => {
    const stored = localStorage.getItem(LC_USERNAME_KEY);
    if (stored) {
      setUsername(stored);
      setSaved(true);
    }
  }, []);

  const handleSaveUsername = () => {
    const trimmed = username.trim();
    if (!trimmed) return;
    localStorage.setItem(LC_USERNAME_KEY, trimmed);
    setSaved(true);
    toast.success(`LeetCode username saved: ${trimmed}`);
  };

  const handleClearUsername = () => {
    localStorage.removeItem(LC_USERNAME_KEY);
    setUsername('');
    setSaved(false);
    setLastResult(null);
  };

  const generateSchedule = (difficulty) => {
    const today = new Date();
    let intervals = [1, 3, 7, 15, 30, 60];
    if (difficulty === 'Hard') intervals = [1, 2, 5, 10, 20, 45];
    else if (difficulty === 'Easy') intervals = [2, 5, 10, 20, 40, 90];
    return intervals.map(d => format(addDays(today, d), 'yyyy-MM-dd'));
  };

  const handleSync = async () => {
    const lcUser = username.trim();
    if (!lcUser) return;

    setSyncing(true);
    setLastResult(null);

    try {
      // 1. Fetch recent AC submissions
      const allAC = await fetchRecentAC(lcUser, 30);
      
      // 2. Filter to today only
      const todayAC = filterTodaySubmissions(allAC);
      
      // 3. De-duplicate (one entry per problem)
      const unique = deduplicateBySlug(todayAC);

      if (unique.length === 0) {
        setLastResult({ imported: 0, skipped: 0 });
        toast('No new accepted submissions found for today.', { icon: 'ℹ️' });
        setSyncing(false);
        return;
      }

      // 4. Fetch existing problems to avoid duplicates
      const { data: existing } = await supabase
        .from('problems')
        .select('title, url')
        .eq('user_id', user.id);

      const existingTitles = new Set((existing || []).map(p => p.title.toLowerCase()));

      // 5. Filter out already-tracked problems
      const newProblems = unique.filter(
        s => !existingTitles.has(s.title.toLowerCase())
      );

      const skipped = unique.length - newProblems.length;

      if (newProblems.length === 0) {
        setLastResult({ imported: 0, skipped });
        toast('All of today\'s submissions are already tracked!', { icon: '✅' });
        setSyncing(false);
        return;
      }

      // 6. Bulk insert new problems
      const rows = newProblems.map(s => ({
        user_id: user.id,
        title: s.title,
        url: `https://leetcode.com/problems/${s.titleSlug}/`,
        difficulty: 'Medium', // LeetCode API doesn't return difficulty in submissions
        tags: ['LeetCode', 'Auto-Imported'],
        notes: '',
        review_schedule: generateSchedule('Medium'),
        current_interval_index: 0,
        next_review_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        interval: 1,
        ease_factor: 2.5,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('problems').insert(rows);
      if (error) throw error;

      setLastResult({ imported: newProblems.length, skipped });
      toast.success(`Imported ${newProblems.length} problem${newProblems.length > 1 ? 's' : ''} from LeetCode!`);

      // Notify parent to refresh
      if (onSynced) onSynced();
    } catch (err) {
      toast.error(err.message || 'Sync failed');
      setLastResult(null);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <Link2 size={18} className="text-slate-500" />
        <h3 className="font-bold text-slate-800 text-sm">LeetCode Sync</h3>
      </div>

      {!saved ? (
        /* Username input state */
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Your LeetCode username"
            className="flex-1 px-3 py-2.5 min-h-[44px] text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 focus:outline-none"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSaveUsername()}
          />
          <button
            onClick={handleSaveUsername}
            disabled={!username.trim()}
            className="px-4 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
          >
            Save
          </button>
        </div>
      ) : (
        /* Synced state */
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm text-slate-600">
              Linked: <span className="font-semibold text-slate-800">{username}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleClearUsername}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors underline"
              >
                Unlink
              </button>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-2 min-h-[36px] text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-70"
              >
                {syncing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                <span>{syncing ? 'Syncing...' : 'Sync Today'}</span>
              </button>
            </div>
          </div>

          {/* Result feedback */}
          {lastResult && (
            <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
              lastResult.imported > 0
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-50 text-slate-500'
            }`}>
              {lastResult.imported > 0 ? (
                <CheckCircle2 size={14} />
              ) : (
                <AlertCircle size={14} />
              )}
              <span>
                {lastResult.imported > 0
                  ? `Imported ${lastResult.imported} new problem${lastResult.imported > 1 ? 's' : ''}`
                  : 'No new problems to import'}
                {lastResult.skipped > 0 && ` · ${lastResult.skipped} already tracked`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
