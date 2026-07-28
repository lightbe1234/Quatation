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
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
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
        padded && 'p-6',
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
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:shadow-none',
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
        'rounded-2xl border px-5 py-4 text-sm font-medium',
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
    <div className="flex min-h-72 flex-col items-center justify-center px-8 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-bms-blue">
        {icon}
      </span>
      <p className="mt-5 font-semibold text-slate-950">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
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
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,62fr)_minmax(24rem,38fr)] 2xl:gap-8">
      <div className="min-w-0 space-y-6">{main}</div>
      <aside className="min-w-0 space-y-6 xl:sticky xl:top-28">{aside}</aside>
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
      <div className="mt-5">{children}</div>
      {footer && (
        <div className="mt-5 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
          {footer}
        </div>
      )}
    </Card>
  )
}
