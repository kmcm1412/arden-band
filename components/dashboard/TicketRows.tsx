'use client'

import { useState, useEffect, useCallback } from 'react'
import { Pencil, Trash2, Check, X, ChevronDown } from 'lucide-react'
import type { TicketSale, TicketOrder } from '@/lib/types'
import { fmtMoney, formatDateTime } from '@/lib/utils'

/**
 * Single-open row state shared by both ticket lists: tapping the open row,
 * tapping anywhere that isn't a row, or pressing Escape all close it. Rows opt
 * in by carrying a `data-expandable` attribute, which is how the outside-tap
 * handler tells "somewhere else on the page" from "inside the open row".
 */
export function useExpandedRow() {
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  useEffect(() => {
    if (!expandedKey) return
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null
      if (el?.closest('[data-expandable]')) return
      setExpandedKey(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedKey(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [expandedKey])

  const toggleRow = useCallback(
    (key: string) => setExpandedKey(k => (k === key ? null : key)),
    []
  )

  return { expandedKey, toggleRow }
}

/** One labelled field inside an expanded row */
export function Detail({
  label,
  wide,
  children,
}: {
  label: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={wide ? 'sm:col-span-3' : undefined}>
      <dt className="text-arden-subtext text-[10px] tracking-widest uppercase mb-1">{label}</dt>
      <dd className="text-arden-text text-sm break-words">{children}</dd>
    </div>
  )
}

/** Ticketholders as a numbered list — the form the door actually reads off */
export function NameList({ names }: { names: string[] }) {
  if (names.length === 0) return <span className="text-arden-subtext">No names given</span>
  return (
    <ol className="space-y-0.5">
      {names.map((n, i) => (
        <li key={i} className="text-arden-white">
          <span className="text-arden-border font-mono text-xs mr-2">{i + 1}.</span>
          {n}
        </li>
      ))}
    </ol>
  )
}

/**
 * The expanding panel. Animating grid-template-rows between 0fr and 1fr is what
 * lets the row slide open to whatever height its content needs — a max-height
 * guess would either clip long name lists or coast through empty space.
 */
function Expander({ id, open, children }: { id: string; open: boolean; children: React.ReactNode }) {
  return (
    <div
      id={id}
      className={`grid transition-all duration-300 ease-out motion-reduce:transition-none ${
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <ChevronDown
      size={14}
      aria-hidden
      className={`flex-shrink-0 transition-transform duration-300 motion-reduce:transition-none ${
        open ? 'rotate-180 text-arden-accent' : 'text-arden-border'
      }`}
    />
  )
}

export function SaleRow({
  sale,
  open,
  onToggle,
  isAdmin,
  onEdit,
  onRemove,
}: {
  sale: TicketSale
  open: boolean
  onToggle: () => void
  isAdmin: boolean
  onEdit: () => void
  onRemove: () => void
}) {
  const names = sale.ticketNames || []
  return (
    <div
      data-expandable
      className={`bg-arden-surface border transition-colors ${
        open ? 'border-arden-accent' : 'border-arden-border'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`sale-detail-${sale.id}`}
        className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-arden-muted/40 transition-colors"
      >
        <Chevron open={open} />
        <div className="flex-1 min-w-0">
          <p className="text-arden-white text-sm font-medium truncate">{sale.name}</p>
          {(names.length > 0 || sale.note) && (
            <p className="text-arden-subtext text-xs truncate">
              {names.length > 0 ? names.join(', ') : sale.note}
            </p>
          )}
        </div>
        <span className="hidden sm:inline text-arden-subtext text-[10px] uppercase tracking-wider flex-shrink-0">
          {sale.method}
        </span>
        <span className="text-arden-text text-sm font-mono flex-shrink-0">
          {sale.qty} tkt{sale.qty === 1 ? '' : 's'}
        </span>
        <span className="text-arden-accent text-sm font-mono flex-shrink-0 w-14 text-right">
          {fmtMoney(sale.amount)}
        </span>
      </button>

      <Expander id={`sale-detail-${sale.id}`} open={open}>
        <div className="border-t border-arden-border px-4 py-4">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            <Detail label="Buyer" wide>
              <span className="text-arden-white">{sale.name}</span>
            </Detail>
            {names.length > 0 && (
              <Detail label={`Ticketholder${names.length === 1 ? '' : 's'}`} wide>
                <NameList names={names} />
              </Detail>
            )}
            <Detail label="Tickets">{sale.qty}</Detail>
            <Detail label="Amount paid">
              <span className="text-arden-accent font-mono">{fmtMoney(sale.amount)}</span>
            </Detail>
            <Detail label="Method">
              <span className="capitalize">{sale.method}</span>
            </Detail>
            <Detail label="Purchased" wide>
              {formatDateTime(sale.addedAt)}
            </Detail>
            <Detail label="Status" wide>
              <span className="text-arden-accent">Confirmed — counted in totals</span>
            </Detail>
            {sale.note && (
              <Detail label="Note" wide>
                {sale.note}
              </Detail>
            )}
          </dl>
          {isAdmin && (
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-arden-border">
              <button onClick={onEdit} className="btn-ghost text-xs py-1.5 px-4">
                <Pencil size={12} /> Edit
              </button>
              <button
                onClick={onRemove}
                className="text-arden-subtext hover:text-red-400 transition-colors text-xs uppercase tracking-wider flex items-center gap-1.5"
              >
                <Trash2 size={12} /> Remove
              </button>
            </div>
          )}
        </div>
      </Expander>
    </div>
  )
}

export function OrderRow({
  order,
  open,
  onToggle,
  busy,
  onAct,
}: {
  order: TicketOrder
  open: boolean
  onToggle: () => void
  busy: boolean
  onAct: (action: 'confirm' | 'void' | 'unconfirm') => void
}) {
  const label = order.names.length > 0 ? order.names.join(', ') : 'No name given'
  return (
    <div
      data-expandable
      className={`bg-arden-surface border transition-colors ${
        open
          ? 'border-arden-accent'
          : order.status === 'pending'
            ? 'border-arden-accent/40'
            : 'border-arden-border'
      } ${order.status === 'void' ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`order-detail-${order.id}`}
          className="flex-1 min-w-0 flex items-center gap-3 p-3.5 text-left hover:bg-arden-muted/40 transition-colors"
        >
          <Chevron open={open} />
          <div className="flex-1 min-w-0">
            <p className="text-arden-white text-sm font-medium truncate">{label}</p>
            <p className="text-arden-subtext text-xs truncate">
              {/* Narrow screens drop the quantity column, so carry it here instead */}
              <span className="sm:hidden">
                {order.qty} tkt{order.qty === 1 ? '' : 's'} ·{' '}
              </span>
              {new Date(order.createdAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
              {order.status === 'pending' && ' · unconfirmed'}
            </p>
          </div>
          <span className="hidden sm:inline text-arden-text text-sm font-mono flex-shrink-0">
            {order.qty} tkt{order.qty === 1 ? '' : 's'}
          </span>
          <span className="text-arden-accent text-sm font-mono flex-shrink-0 w-14 text-right">
            {fmtMoney(order.amount)}
          </span>
          <span
            className={`hidden md:inline text-[10px] tracking-wider uppercase px-2 py-0.5 border flex-shrink-0 ${
              order.status === 'confirmed'
                ? 'border-arden-accent/40 text-arden-accent'
                : order.status === 'void'
                  ? 'border-arden-border text-arden-subtext'
                  : 'border-yellow-700 text-yellow-500'
            }`}
          >
            {order.status === 'pending' ? 'unconfirmed' : order.status}
          </span>
        </button>
        {/* Siblings of the toggle, not children — so acting never expands the row */}
        <div className="flex items-center gap-2 flex-shrink-0 pr-3.5 pl-1">
          {order.status === 'pending' ? (
            <>
              <button
                onClick={() => onAct('confirm')}
                disabled={busy}
                title="Payment received — add to ticket sales"
                aria-label={`Confirm checkout for ${label}`}
                className="text-arden-subtext hover:text-arden-accent transition-colors disabled:opacity-40"
              >
                <Check size={15} />
              </button>
              <button
                onClick={() => onAct('void')}
                disabled={busy}
                title="Never paid — dismiss"
                aria-label={`Dismiss checkout for ${label}`}
                className="text-arden-subtext hover:text-red-400 transition-colors disabled:opacity-40"
              >
                <X size={15} />
              </button>
            </>
          ) : (
            <button
              onClick={() => onAct('unconfirm')}
              disabled={busy}
              title="Undo — pull back out of ticket sales"
              className="text-arden-subtext hover:text-arden-accent transition-colors text-xs uppercase tracking-wider disabled:opacity-40"
            >
              Undo
            </button>
          )}
        </div>
      </div>

      <Expander id={`order-detail-${order.id}`} open={open}>
        <dl className="border-t border-arden-border px-4 py-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          <Detail label={`Ticketholder${order.qty === 1 ? '' : 's'}`} wide>
            <NameList names={order.names} />
          </Detail>
          <Detail label="Tickets">{order.qty}</Detail>
          <Detail label="Amount">
            <span className="text-arden-accent font-mono">{fmtMoney(order.amount)}</span>
            <span className="text-arden-subtext text-xs"> ({fmtMoney(order.unitPrice)} ea)</span>
          </Detail>
          <Detail label="Method">Venmo</Detail>
          <Detail label="Status">
            {order.status === 'pending' ? (
              <span className="text-yellow-500">Unconfirmed — not in totals</span>
            ) : order.status === 'confirmed' ? (
              <span className="text-arden-accent">Confirmed — counted</span>
            ) : (
              <span className="text-arden-subtext">Dismissed</span>
            )}
          </Detail>
          <Detail label="Checked out">{formatDateTime(order.createdAt)}</Detail>
          {order.confirmedAt && (
            <Detail label="Confirmed">
              {formatDateTime(order.confirmedAt)}
              {order.confirmedBy && (
                <span className="text-arden-subtext text-xs"> by {order.confirmedBy}</span>
              )}
            </Detail>
          )}
          <Detail label="Venmo note — match this in your feed" wide>
            <code className="block bg-arden-dark border border-arden-border px-3 py-2 font-mono text-xs text-arden-white select-all">
              {order.note}
            </code>
          </Detail>
          <Detail label="Show" wide>
            {order.showVenue}
            {order.showDatetime && (
              <span className="text-arden-subtext"> · {formatDateTime(order.showDatetime)}</span>
            )}
          </Detail>
        </dl>
      </Expander>
    </div>
  )
}
