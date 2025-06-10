'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function Navbar({ links = [] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="sm:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none"
        onClick={() => setOpen(!open)}
        aria-label="Toggle navigation"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <nav
        className={`${
          open ? 'block' : 'hidden'
        } absolute right-0 mt-2 w-48 bg-white shadow-md rounded-md sm:static sm:mt-0 sm:block sm:w-auto sm:bg-transparent sm:shadow-none`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-4 py-2 text-gray-800 font-medium hover:bg-gray-100"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
