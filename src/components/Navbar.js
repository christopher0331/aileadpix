'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function Navbar({ links = [] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Toggle button */}
      <button
        className="sm:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none"
        onClick={() => setOpen(!open)}
        aria-label="Toggle navigation"
      >
        {open ? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Overlay */}
      {open && <div className="fixed inset-0 z-30 bg-black/50 sm:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar / nav container */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform sm:static sm:shadow-none sm:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}`}
      >
        <nav className="flex flex-col p-4 space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="text-gray-800 font-medium hover:text-indigo-600"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
