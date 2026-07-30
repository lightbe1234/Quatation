import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'dark' | 'financial' | 'ghost'

function joinClasses(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description?: string
}) {
  return (
    <header className="max-w-4xl">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-bms-blue">
        {eyebrow}
      </p>
      <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      )}
    </header>
  )
}

export function Card({
  children,
  className,
  padded = true,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <section
      className={joinClasses(
        'rounded-2xl border border-slate-200 bg-white shadow-sm',
        padded && 'p-5 sm:p-6',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  )
}

export function Button({
  children,
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
}) {
  const variants: Record<Variant, string> = {
    primary:
      'border-bms-blue bg-bms-blue text-white shadow-sm hover:bg-blue-900 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500',
    secondary:
      'border-bms-blue bg-white text-bms-blue hover:bg-blue-50 disabled:border-slate-300 disabled:text-slate-400',
    dark:
      'border-slate-900 bg-slate-900 text-white hover:bg-slate-700 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500',
    financial:
      'border-amber-700 bg-amber-50 text-amber-900 hover:bg-amber-100 disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400',
    ghost:
      'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60',
  }

  return (
    <button
      className={joinClasses(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:shadow-none',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function StatusMessage({
  children,
  tone = 'success',
}: {
  children: ReactNode
  tone?: 'success' | 'error' | 'info'
}) {
  const tones = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    error: 'border-red-200 bg-red-50 text-red-800',
    info: 'border-blue-200 bg-blue-50 text-bms-blue',
  }

  return (
    <div
      aria-live="polite"
      className={joinClasses(
        'rounded-xl border px-4 py-3 text-sm font-medium',
        tones[tone],
      )}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-bms-blue">
        {icon}
      </span>
      <p className="mt-4 font-semibold text-slate-950">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  )
}

export function TwoColumnLayout({
  main,
  aside,
}: {
  main: ReactNode
  aside: ReactNode
}) {
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,62fr)_minmax(22rem,38fr)] 2xl:gap-6">
      <div className="min-w-0 space-y-5">{main}</div>
      <aside className="min-w-0 space-y-5 xl:sticky xl:top-24">{aside}</aside>
    </div>
  )
}

export function SummaryPanel({
  children,
  title,
  eyebrow,
  footer,
}: {
  children: ReactNode
  title: string
  eyebrow?: string
  footer?: ReactNode
}) {
  return (
    <Card className="border-slate-300 shadow-md shadow-slate-950/5">
      <div>
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {eyebrow}
          </p>
        )}
        <h3 className="mt-1 text-lg font-bold text-slate-950">{title}</h3>
      </div>
      <div className="mt-4">{children}</div>
      {footer && (
        <div className="mt-4 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">
          {footer}
        </div>
      )}
    </Card>
  )
}
