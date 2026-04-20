import { differenceInDays, addDays, format, isBefore, isAfter, isSameDay } from 'date-fns';

/**
 * Recalculates `interval` and `ease_factor` based on a drag-and-drop manual reschedule.
 * @param {Object} problem The problem object from DB
 * @param {string|Date} newDate The target date string ('yyyy-MM-dd')
 * @returns {Object} { next_review_date, interval, ease_factor }
 */
export function recalculateSpacedRepetition(problem, newDate) {
  const newDateStr = typeof newDate === 'string' ? newDate : format(newDate, 'yyyy-MM-dd');
  
  // Extract or default existing factors
  // If problem is legacy, guess the current scheduled date.
  let oldDateStr = problem.next_review_date;
  if (!oldDateStr && problem.review_schedule && problem.review_schedule.length > problem.current_interval_index) {
    oldDateStr = problem.review_schedule[problem.current_interval_index];
  } else if (!oldDateStr) {
    oldDateStr = format(new Date(), 'yyyy-MM-dd'); // Default to today if completely unknown
  }

  const oldDateObj = new Date(oldDateStr);
  const newDateObj = new Date(newDateStr);

  let currentInterval = problem.interval || 1;
  let currentEase = problem.ease_factor || 2.5;

  if (isBefore(newDateObj, oldDateObj) && !isSameDay(newDateObj, oldDateObj)) {
    // Moved earlier
    currentInterval = currentInterval * 0.7;
    currentEase -= 0.05;
  } else if (isAfter(newDateObj, oldDateObj) && !isSameDay(newDateObj, oldDateObj)) {
    // Moved later
    currentInterval = currentInterval * 1.2;
    currentEase += 0.05;
  }

  // Clamping
  currentInterval = Math.max(1, currentInterval);
  currentEase = Math.max(1.3, Math.min(2.5, currentEase));

  return {
    next_review_date: newDateStr,
    interval: currentInterval,
    ease_factor: currentEase,
  };
}

/**
 * Greedy Load Balancer algorithm.
 * Groups by date, caps at `maxPerDay`. Pushes overflow to the next earliest available day.
 * @param {Array} problems Array of all pending problems
 * @param {number} maxPerDay Max allowed items per day (default 10)
 * @returns {Array} List of problems whose `next_review_date` was changed due to load balancing.
 */
export function rebalanceSchedule(problems, maxPerDay = 10) {
  const changedProblems = [];
  
  // Sort pending problems ascending by their next_review_date
  // We only run this on PENDING problems, do not pass completed historical logs here.
  const sorted = [...problems].sort((a, b) => {
    const dateA = a.next_review_date || (a.review_schedule ? a.review_schedule[a.current_interval_index] : '9999-12-31');
    const dateB = b.next_review_date || (b.review_schedule ? b.review_schedule[b.current_interval_index] : '9999-12-31');
    return new Date(dateA) - new Date(dateB);
  });

  const dailyCounts = new Map(); // 'yyyy-MM-dd' -> count

  for (const problem of sorted) {
    let targetDateStr = problem.next_review_date || (problem.review_schedule ? problem.review_schedule[problem.current_interval_index] : null);
    if (!targetDateStr) continue;

    let targetDateObj = new Date(targetDateStr);
    
    // Find the next available day that isn't overloaded
    while ((dailyCounts.get(targetDateStr) || 0) >= maxPerDay) {
      targetDateObj = addDays(targetDateObj, 1);
      targetDateStr = format(targetDateObj, 'yyyy-MM-dd');
    }

    // Assign slot
    dailyCounts.set(targetDateStr, (dailyCounts.get(targetDateStr) || 0) + 1);

    // If we had to change the date, mark it as changed
    const originalDate = problem.next_review_date || (problem.review_schedule ? problem.review_schedule[problem.current_interval_index] : null);
    if (targetDateStr !== originalDate) {
      // Create a mutated copy returning ONLY what changed to bulk patch
      changedProblems.push({
        id: problem.id,
        next_review_date: targetDateStr,
        _originalDate: originalDate // helpful for local state updates before DB response
      });
    }
  }

  return changedProblems;
}
