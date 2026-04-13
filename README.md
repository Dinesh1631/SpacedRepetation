# Spaced Repetition DSA Tracker

A modern, full-stack web application designed to help you track your Data Structures and Algorithms (DSA) problem-solving journey using **Spaced Repetition**. This ensures long-term retention of algorithmic patterns by automatically scheduling review dates based on problem difficulty.

## 🚀 Tech Stack

- **Frontend:** React (Vite)
- **Styling:** Tailwind CSS (v4)
- **Icons:** Lucide React
- **Dates & Calendars:** date-fns
- **Backend & Auth:** Supabase (PostgreSQL)
- **Deployment:** Vercel

## ✨ Core Features

- **Authentication:** Secure user registration and login via Supabase Auth.
- **Problem Management:** Add problems with titles, URLs, tags, and select a difficulty.
- **Custom Spaced Repetition:** Intervals are automatically generated based on the selected difficulty:
  - Default: `[1, 3, 7, 15, 30, 60] days`
  - Hard: `[1, 2, 5, 10, 20, 45] days`
  - Easy: `[2, 5, 10, 20, 40, 90] days`
- **Dashboard Overview:** Instantly see which problems are due for review "today". Mark them as reviewed to push them to the next interval.
- **Interactive Calendar:** A fully custom calendar grid mapping out all scheduled past and future reviews.

## 🌍 Live Application

This project is deployed using **Vercel** and connects to a centralized **Supabase** instance.

Users can simply visit the live website, create an account, and instantly begin tracking their DSA progress without needing to configure or set up their own database! The backend handles secure multi-tenant data storage, ensuring every user only accessing their own problems securely.

---
*(If you wish to clone and run this locally for your own development, simply run `npm install` and `npm run dev` in the `frontend` folder. You will need to provide your own Supabase credentials inside `frontend/.env`)*