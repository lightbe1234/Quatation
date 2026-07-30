import { Link } from 'react-router-dom'
import { Card, PageHeader } from '../components/ui'

export function HomePage() {
  const workflow = [
    {
      number: '01',
      title: 'Store directory',
      description:
        'Keep branch IDs and contacts ready for quotation auto-fill.',
      label: 'Manage stores',
      to: '/stores',
    },
    {
      number: '02',
      title: 'Build quotation',
      description:
        'Prepare up to 12 line items with instant totals, then review the actual Excel-rendered document.',
      label: 'New quotation',
      to: '/quotations/new',
    },
    {
      number: '03',
      title: 'Deliver to workbook',
      description:
        'Generate the Excel-rendered PDF, log Summary, and transfer to Financial.',
      label: 'Check OneDrive',
      to: '/onedrive',
    },
  ]

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,62fr)_minmax(22rem,38fr)] lg:items-end">
          <PageHeader
            description="Prepare accurate service quotations, render the approved Excel template, and keep the Summary and Financial logs aligned."
            eyebrow="Quotation workspace ready"
            title="From outlet request to finished quotation."
          />
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <Link
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-bms-blue bg-bms-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900"
              to="/quotations/new"
            >
              Create quotation
              <span aria-hidden="true">-&gt;</span>
            </Link>
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-bms-blue bg-white px-4 py-2 text-sm font-semibold text-bms-blue transition hover:bg-blue-50"
              to="/stores"
            >
              Open store directory
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-bms-blue">
              Working sequence
            </p>
            <h3 className="mt-1.5 text-xl font-bold tracking-tight text-slate-950">
              One controlled workflow
            </h3>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-500">
            Supabase keeps the application record. OneDrive remains the
            business workbook and PDF source.
          </p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {workflow.map((item) => (
            <Card
              className="group flex min-h-52 flex-col transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-950/5"
              key={item.number}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-bms-blue">
                  {item.number}
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-emerald-700">
                  Ready
                </span>
              </div>
              <h4 className="mt-6 text-lg font-bold text-slate-950">
                {item.title}
              </h4>
              <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
                {item.description}
              </p>
              <Link
                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-bms-blue group-hover:text-blue-800"
                to={item.to}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className="transition group-hover:translate-x-1"
              >
                -&gt;
              </span>
            </Link>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
