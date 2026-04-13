# Development History: Spaced Repetition DSA Tracker

Here is a comprehensive log of everything we have conceptualized, architected, and built throughout this session.

## 1. Foundation & Architecture
- **Vite Setup:** Initialized a blazing-fast React environment using `create-vite`.
- **Tailwind CSS v4 Integration:** Upgraded the styling engine to Tailwind's latest PostCSS integration, ensuring zero configuration styling with maximum utility efficiency.
- **Supabase Integration:** Set up the `@supabase/supabase-js` client to handle all Authentication and PostgreSQL operations dynamically.
- **Routing:** Configured `react-router-dom` to support Client-Side SPA routing with a centralized `<App />` container.

## 2. Authentication & Layouts
- **Auth System:** Built `Login.jsx` functioning exactly as a centralized portal for both Login and Registration depending on the toggle state.
- **Auth Context:** Wrapped the application in an `AuthContext.jsx` that listens dynamically to Supabase Session changes to prevent momentary logouts on refresh.
- **Protected Routes:** Created an authorization wrapper (`ProtectedRoute.jsx`) that instantly boots unauthenticated users attempting to bypass the Login screen.
- **Responsive Layouts:** Designed `DashboardLayout.jsx` featuring a side navigation bar (Dashboard, Problems, Calendar) utilizing `lucide-react` icons.

## 3. Core Logic: Spaced Repetition & Problems
- **Database Schema (`problems`):** Defined a Postgres schema capable of storing problem links, difficulty tags, and a highly crucial `review_schedule` DATE Array.
- **Problem Entry UI:** Built `AddProblemModal.jsx` to intake new DSA challenges.
- **Spaced Repetition Algorithm:** Wrote logic upon problem creation that instantly generates an Array of EXACT Review Dates for the user based on the selected difficulty:
  - Default: `[+1, +3, +7, +15, +30, +60 days]`
  - Easy problems naturally get stretched further out, while Hard problems pull their review dates closer to ensure rapid recall.
- **List View:** Implemented `Problems.jsx` to search, filter, and render modern cards mapped to their respective tags and difficulty colors.

## 4. Dashboard & Daily Tracking
- **Due Today Algorithm:** Engineered `Dashboard.jsx` to dynamically verify if an active problem's exact position in its `review_schedule` is less than or strictly equal to `Today`. 
- **Review Mutation:** Integrated a "Mark as Reviewed" button that increments the `current_interval_index` within Supabase, pushing the problem magically to the next date without rebuilding arrays on the fly. 

## 5. Calendar Visualizer
- **Monthly Grid Matrix:** Built a perfectly scaled monthly Calendar (`CalendarView.jsx`) natively without third party CSS frameworks utilizing `date-fns`.
- **Future Load Balancing:** Automatically reads all elements in the `review_schedule` arrays to project how many problems are scheduled for each exact day of the month.
- **Selected Day Preview:** Allows clicking on any Calendar Day to immediately display the specific names and difficulties of problems queued for that date.

## 6. Daily Streaks & GitHub-Style Heatmap
- **Historical Scaling:** Identified that overwriting single fields is destructive to history, and successfully expanded the database schema to include a `review_logs` table.
- **Activity Heatmap Engine:** Built `ActivityHeatmap.jsx` to perfectly replicate the iconic GitHub commit graph.
  - Calculated `subMonths` natively to align exactly to `startOfWeek` (Sunday).
  - Dynamically injects column-based `Month Labels` identifying precisely when months transition.
- **Streak Calculation:** Implemented a recursive walk-back function that reads historical logs to display an active `Day Streak` counter.
- **Mobile First Focus:** Designed `overflow-x-auto` wrappers to ensure incredibly wide heatmap SVGs won't crash the layout on iOS/Android devices.

## 7. Configuration & Deployment 
- **SPA Rewrites:** Solved typical Single Page Application Server `404` errors by defining explicit wildcard routing paths inside `vercel.json`.
- **Git Safety:** Finalized `.gitignore` files to ensure all `.env` secrets remain secured out of source tracking.
- **Title Personalization:** Modifed the HTML application skeleton to display `Retention` instead of stock Vite boilerplate.
