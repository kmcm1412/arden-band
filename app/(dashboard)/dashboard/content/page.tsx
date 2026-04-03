'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import DashboardGuard from '@/components/dashboard/DashboardGuard'

function ContentPageContent() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1">Admin</p>
        <h1 className="text-2xl font-display font-bold text-arden-white">Content Management</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {[
          { label: 'Shows', desc: 'Manage public shows', href: '/dashboard/shows' },
          { label: 'Set Lists', desc: 'Build and organize set lists', href: '/dashboard/setlists' },
          { label: 'Opportunities', desc: 'Track venues and outreach', href: '/dashboard/opportunities' },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="group p-5 bg-arden-surface border border-arden-border hover:border-arden-muted transition-all flex items-start justify-between">
            <div>
              <h3 className="font-medium text-arden-white mb-1">{item.label}</h3>
              <p className="text-arden-subtext text-sm">{item.desc}</p>
            </div>
            <ExternalLink size={14} className="text-arden-border group-hover:text-arden-subtext mt-1" />
          </Link>
        ))}
      </div>

      <div className="mt-8 p-4 bg-arden-surface border border-arden-border">
        <p className="text-xs text-arden-subtext leading-relaxed">
          <strong className="text-arden-text">Media:</strong> Videos are sourced from the{' '}
          <a href="https://youtube.com/@ardenjams" target="_blank" rel="noopener noreferrer"
            className="text-arden-accent hover:text-arden-white transition-colors">
            @ardenjams YouTube channel
          </a>
          . Update YouTube to refresh media on the site.
        </p>
      </div>
    </div>
  )
}

export default function ContentPage() {
  return (
    <DashboardGuard requireAdmin>
      <ContentPageContent />
    </DashboardGuard>
  )
}
