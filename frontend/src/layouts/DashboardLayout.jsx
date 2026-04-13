import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, LayoutDashboard, ListTodo, LogOut, Menu, X } from 'lucide-react';

export const DashboardLayout = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'All Problems', path: '/problems', icon: <ListTodo size={20} /> },
    { name: 'Calendar', path: '/calendar', icon: <Calendar size={20} /> }
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      
      {/* Mobile Top Header */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4">
        <h1 className="text-xl font-bold font-serif text-slate-800">
          Retention
        </h1>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 -mr-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Backdrop Overlay (Mobile) */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50 
        w-64 bg-white border-r border-slate-200 
        flex flex-col justify-between
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div>
          <div className="p-6 flex items-center justify-between">
            <h1 className="text-xl font-bold font-serif text-slate-800">
              Retention
            </h1>
            <button 
              className="md:hidden p-1 text-slate-400 hover:text-slate-600 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <nav className="px-4 py-2 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-colors font-medium min-h-[44px] ${
                  pathname === item.path
                    ? 'bg-slate-100 text-slate-900 border-l-4 border-slate-800 rounded-l-none'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="p-4 border-t border-slate-200">
          <div className="mb-4 px-3 flex flex-col">
            <span className="text-sm font-semibold text-slate-800 truncate">Account</span>
            <span className="text-xs text-slate-500 truncate">{user?.email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-3 min-h-[44px] text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors font-medium "
          >
            <LogOut size={20} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-16 md:pt-0 w-full">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
