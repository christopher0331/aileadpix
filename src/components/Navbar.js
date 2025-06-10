'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function Navbar({ links = [] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="sm:hidden relative w-8 h-8 focus:outline-none"
        onClick={() => setOpen(!open)}
        aria-label="Toggle navigation"
      >
        <span
          className={`absolute block h-0.5 w-8 bg-gray-600 transform transition duration-300 ease-in-out ${
            open ? 'rotate-45 top-3.5' : 'top-2'
          }`}
        ></span>
        <span
          className={`absolute block h-0.5 w-8 bg-gray-600 transition duration-300 ease-in-out ${
            open ? 'opacity-0' : 'top-4'
          }`}
        ></span>
        <span
          className={`absolute block h-0.5 w-8 bg-gray-600 transform transition duration-300 ease-in-out ${
            open ? '-rotate-45 top-3.5' : 'top-6'
          }`}
        ></span>
      </button>
      <nav
        className={`${
          open ? 'translate-x-0' : '-translate-x-full'
        } fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 sm:static sm:h-auto sm:w-auto sm:bg-transparent sm:shadow-none sm:translate-x-0`}
      >
        <div className="mt-16 sm:mt-0 flex flex-col sm:flex-row sm:items-center">
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
