import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

const navItems = [
  { label: 'Overview', to: '/' },
  { label: 'Stores', to: '/stores' },
  { label: 'New Quotation', to: '/quotations/new' },
  { label: 'Records', to: '/records' },
  { label: 'OneDrive', to: '/onedrive' },
]

export function AppLayout() {
  const { signOut, user } = useAuth()

  return (
    <div className="min-h-screen text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-bms-blue text-sm font-black tracking-tight text-white shadow-sm shadow-blue-950/20">
              BMS
            </span>
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-bms-blue">
                Operations desk
              </p>
              <h1 className="mt-0.5 text-lg font-bold tracking-tight text-slate-950">
                Quotation Management
              </h1>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <nav
              aria-label="Main navigation"
              className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:pb-0"
            >
              {navItems.map((item) => (
                <NavLink
                  className={({ isActive }) =>
                    `shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bms-blue ${
                      isActive
                        ? 'bg-bms-blue text-white shadow-sm'
                        : 'text-slate-600 hover:bg-blue-50 hover:text-bms-blue'
                    }`
                  }
                  end={item.to === '/'}
                  key={item.to}
                  to={item.to}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-3 px-1 text-xs text-slate-500">
              <span className="max-w-52 truncate">{user?.email}</span>
              <button
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-bms-blue"
                onClick={() => void signOut()}
                type="button"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 sm:py-10">
        <Outlet />
      </main>

      <footer className="mx-auto w-full max-w-[1600px] px-5 pb-8 sm:px-8">
        <div className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>BMS Operations / Quotation workspace</p>
          <p>Supabase records / Microsoft Excel delivery</p>
        </div>
      </footer>
    </div>
  )
}
