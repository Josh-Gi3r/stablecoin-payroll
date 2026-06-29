import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Calculator, Loader2 } from 'lucide-react';
import { fadeUp, stagger } from '../../lib/viewConstants';
import { deposits as depositsApi } from '../../lib/api';
import { useApiList, coerceError } from '../../hooks/useApi';

type Deposit = {
  id: string;
  tenantId: string | null;
  clientId: string | null;
  employeeId: string | null;
  amount: number;
  currency: string;
  calculationBasis: string | null;
  status: 'pending' | 'received' | 'held' | 'drawn' | 'refunded';
  trustAccountRef: string | null;
  receivedDate: string | null;
  refundDate: string | null;
  createdAt: string;
};

const pillClass: Record<Deposit['status'], string> = {
  pending:  'pill-warn',
  received: 'pill-success',
  held:     'pill-primary',
  drawn:    'pill-tertiary',
  refunded: 'pill-muted',
};

export default function DepositsView() {
  const { data: list, loading, error: loadError, reload } = useApiList<Deposit>(
    () => depositsApi.list(),
    [],
    'Failed to load deposits',
  );

  const [salary, setSalary] = useState('5000');
  const [noticeMonths, setNoticeMonths] = useState('1');
  const [allowance, setAllowance] = useState('0');
  const [quote, setQuote] = useState<number | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const error = loadError ?? quoteError;

  const runQuote = async () => {
    setQuoting(true);
    setQuoteError(null);
    try {
      const res = await depositsApi.quote({
        salary: Number(salary) || 0,
        fixedAllowances: allowance && Number(allowance) > 0
          ? [{ label: 'Allowance', amount: Number(allowance) }]
          : [],
        noticeMonths: Number(noticeMonths) || 1,
      });
      setQuote(res.amount);
    } catch (e: any) {
      setQuoteError(coerceError(e, 'Quote failed'));
    } finally {
      setQuoting(false);
    }
  };

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="p-4 md:p-6 space-y-5"
    >
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Deposits</h1>
        <p className="text-sm mt-1 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
          Upfront trust-account deposits covering each employee's notice period.
          Deposit = (base salary + fixed allowances) × notice months.
        </p>
      </motion.div>

      {error && (
        <motion.div variants={fadeUp} className="pill pill-danger w-full justify-start !rounded-xl !px-3 !py-2 !text-sm">
          {error}
        </motion.div>
      )}

      {/* Quote calculator */}
      <motion.div variants={fadeUp} className="surface p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="icon-chip-tertiary icon-chip" style={{ width: '1.75rem', height: '1.75rem' }}>
            <Calculator className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Deposit quote calculator</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Gross salary (MYR)" value={salary} onChange={setSalary} type="number" />
          <Field label="Fixed allowance / month" value={allowance} onChange={setAllowance} type="number" />
          <Field label="Notice (months)" value={noticeMonths} onChange={setNoticeMonths} type="number" />
          <div className="flex items-end">
            <button onClick={runQuote} disabled={quoting} className="btn-primary w-full">
              {quoting && <Loader2 className="w-4 h-4 animate-spin" />}
              Quote deposit
            </button>
          </div>
        </div>
        {quote !== null && (
          <div
            className="rounded-xl p-4"
            style={{ background: 'var(--primary-soft)', border: '1px solid var(--border-default)' }}
          >
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Required deposit</p>
            <p className="text-2xl font-semibold mt-0.5" style={{ color: 'var(--primary-300)' }}>
              RM {quote.toLocaleString()}
            </p>
          </div>
        )}
      </motion.div>

      <motion.div variants={fadeUp} className="surface overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="icon-chip icon-chip" style={{ width: '1.75rem', height: '1.75rem' }}>
            <Wallet className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {list.length} {list.length === 1 ? 'deposit' : 'deposits'}
          </h2>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>
        ) : list.length === 0 ? (
          <div className="p-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No deposits yet. Create one from an employee record to hold in trust.
          </div>
        ) : (
          <>
            {/* Desktop */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th className="px-5 py-3 font-medium">Employee</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Currency</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Trust ref</th>
                  <th className="px-5 py-3 font-medium">Received</th>
                </tr>
              </thead>
              <tbody>
                {list.map((d) => {
                  const basis = d.calculationBasis ? JSON.parse(d.calculationBasis) : null;
                  return (
                    <tr key={d.id} className="table-row">
                      <td className="px-5 py-3">
                        <div className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{d.employeeId ?? '—'}</div>
                        {basis && (
                          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {basis.noticeMonths}mo × (RM {basis.grossSalary.toLocaleString()}
                            {basis.fixedAllowances?.length > 0 && ` + RM ${basis.fixedAllowances.reduce((s: number, a: any) => s + a.amount, 0).toLocaleString()} allow.`})
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>{d.amount.toLocaleString()}</td>
                      <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{d.currency}</td>
                      <td className="px-5 py-3"><span className={`pill capitalize ${pillClass[d.status]}`}>{d.status}</span></td>
                      <td className="px-5 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{d.trustAccountRef ?? '—'}</td>
                      <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{d.receivedDate?.slice(0, 10) ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {list.map((d) => {
                const basis = d.calculationBasis ? JSON.parse(d.calculationBasis) : null;
                return (
                  <div key={d.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{d.employeeId ?? '—'}</p>
                        <p className="font-semibold text-lg mt-1" style={{ color: 'var(--text-primary)' }}>
                          {d.currency} {d.amount.toLocaleString()}
                        </p>
                      </div>
                      <span className={`pill capitalize ${pillClass[d.status]}`}>{d.status}</span>
                    </div>
                    {basis && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {basis.noticeMonths}mo × RM {basis.grossSalary.toLocaleString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="field" />
    </div>
  );
}
