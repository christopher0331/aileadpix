'use client'

import Link from 'next/link'

export default function MainNav() {
  const linkClass = 'px-3 py-2 rounded-md text-gray-800 font-medium hover:bg-gray-100';
  return (
    <nav className="flex space-x-4">
      <Link href="/" className={linkClass}>Home</Link>
      <Link href="/scraped-contacts" className={linkClass}>Scraped Contacts</Link>
      <Link href="/filtered-contacts" className={linkClass}>Filtered Contacts</Link>
      <Link href="/email-campaign" className={linkClass}>Email Campaign</Link>
      <Link href="/screenshot-review" className={linkClass}>Screenshot Review</Link>
      <Link href="/crm" className={linkClass}>CRM</Link>
      <Link href="/domain-export" className={linkClass}>Domain Export</Link>
    </nav>
  )
}
