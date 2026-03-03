import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import {
    Search, ArrowUpCircle, ArrowDownCircle, CreditCard, Trash2, Coins
} from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Customer { _id: string; name: string; mobile: string; currentBalance: number; }
interface LedgerEntry {
    _id: string; date: string; description: string;
    credit: number; debit: number; balance: number; entryType: string;
}
interface SilverPayment {
    grossWeight: number; purity: number; fineWeight: number;
    silverRate: number; silverValue: number;
}
interface Bill { _id: string; billNumber: number; date: string; remainingBalance: number; totalPayable: number; }

// ─────────────────────────────────────────────
// Entry-type badge config
// ─────────────────────────────────────────────
const ENTRY_BADGE: Record<string, { label: string; cls: string }> = {
    BILL: { label: 'बिल', cls: 'bg-red-100 text-red-700 border-red-300' },
    CASH_PAYMENT: { label: 'रोख', cls: 'bg-green-100 text-green-700 border-green-300' },
    UPI_PAYMENT: { label: 'UPI', cls: 'bg-blue-100 text-blue-700 border-blue-300' },
    BANK_PAYMENT: { label: 'बँक', cls: 'bg-purple-100 text-purple-700 border-purple-300' },
    SILVER_PAYMENT: { label: '🪙 चांदी', cls: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    SILVER_ADJUSTMENT: { label: '🪙 चांदी समायोजन', cls: 'bg-amber-100 text-amber-800 border-amber-400' },
    MANUAL_CREDIT: { label: 'जमा', cls: 'bg-teal-100 text-teal-700 border-teal-300' },
    MANUAL_DEBIT: { label: 'उधार', cls: 'bg-orange-100 text-orange-700 border-orange-300' },
};

type PaymentMode = 'Cash' | 'UPI' | 'Bank' | 'Silver' | 'Mixed';

const MODE_LABELS: Record<PaymentMode, string> = {
    Cash: 'रोख', UPI: 'UPI', Bank: 'बँक', Silver: 'चांदी', Mixed: 'मिश्र',
};

// ─────────────────────────────────────────────
// Silver fields sub-form
// ─────────────────────────────────────────────
const SilverFields = ({ silver, onChange, currentRate }: {
    silver: SilverPayment;
    onChange: (s: SilverPayment) => void;
    currentRate: number;
}) => {
    const update = (field: keyof SilverPayment, value: number) => {
        const next = { ...silver, [field]: value };
        const gw = field === 'grossWeight' ? value : next.grossWeight;
        const pur = field === 'purity' ? value : next.purity;
        const rate = field === 'silverRate' ? value : next.silverRate;
        next.fineWeight = parseFloat(((gw * pur) / 100).toFixed(4));
        next.silverValue = parseFloat((next.fineWeight * rate).toFixed(2));
        onChange(next);
    };

    return (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg space-y-2">
            <p className="text-xs font-semibold text-yellow-800 flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" /> चांदी तपशील
            </p>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-xs text-yellow-700 block mb-1">एकूण वजन (ग्रॅम) *</label>
                    <input type="number" min={0} value={silver.grossWeight || ''}
                        onChange={e => update('grossWeight', parseFloat(e.target.value) || 0)}
                        className="w-full border border-yellow-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
                        placeholder="0" />
                </div>
                <div>
                    <label className="text-xs text-yellow-700 block mb-1">शुद्धता % *</label>
                    <input type="number" min={0} max={100} value={silver.purity || ''}
                        onChange={e => update('purity', parseFloat(e.target.value) || 0)}
                        className="w-full border border-yellow-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
                        placeholder="80" />
                </div>
                <div>
                    <label className="text-xs text-yellow-700 block mb-1">फाइन वजन (g)</label>
                    <input type="number" value={silver.fineWeight || ''} readOnly
                        className="w-full border border-yellow-200 rounded px-2 py-1.5 text-sm bg-yellow-100 text-yellow-800 font-semibold" />
                </div>
                <div>
                    <label className="text-xs text-yellow-700 block mb-1">दर ₹/g *</label>
                    <input type="number" min={0} value={silver.silverRate || ''}
                        onChange={e => update('silverRate', parseFloat(e.target.value) || 0)}
                        onFocus={() => { if (!silver.silverRate && currentRate) update('silverRate', currentRate); }}
                        className="w-full border border-yellow-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
                        placeholder={String(currentRate || '')} />
                </div>
            </div>
            {silver.silverValue > 0 && (
                <div className="flex items-center justify-between bg-yellow-100 rounded px-3 py-2 mt-1">
                    <span className="text-xs text-yellow-700 font-medium">चांदी मूल्य:</span>
                    <span className="text-base font-bold text-yellow-900">₹{silver.silverValue.toFixed(2)}</span>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────
// Main Ledger Component
// ─────────────────────────────────────────────
const Ledger = () => {
    const [searchParams] = useSearchParams();
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [search, setSearch] = useState(searchParams.get('customerName') || '');
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(true);
    const [silverRatePerGram, setSilverRatePerGram] = useState(0);

    // ── Payment Modal ──
    const [showPayment, setShowPayment] = useState(false);
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
    const [cashAmount, setCashAmount] = useState('');
    const [upiAmount, setUpiAmount] = useState('');
    const [bankAmount, setBankAmount] = useState('');
    const [silver, setSilver] = useState<SilverPayment>({ grossWeight: 0, purity: 0, fineWeight: 0, silverRate: 0, silverValue: 0 });
    const [paymentSaving, setPaymentSaving] = useState(false);

    // ── Silver Adjustment Modal ──
    const [showAdjustment, setShowAdjustment] = useState(false);
    const [customerBills, setCustomerBills] = useState<Bill[]>([]);
    const [adjBillId, setAdjBillId] = useState('');
    const [adjDate, setAdjDate] = useState(new Date().toISOString().split('T')[0]);
    const [adjSilver, setAdjSilver] = useState<SilverPayment>({ grossWeight: 0, purity: 0, fineWeight: 0, silverRate: 0, silverValue: 0 });
    const [adjNotes, setAdjNotes] = useState('');
    const [adjSaving, setAdjSaving] = useState(false);

    // ── Load all customers ──
    useEffect(() => {
        setListLoading(true);
        api.get('/customers').then(r => setAllCustomers(r.data)).catch(() => { }).finally(() => setListLoading(false));

        // Fetch silver rate
        api.get('/silver-rates')
            .then(r => setSilverRatePerGram(parseFloat(((r.data?.rate || 0) / 1000).toFixed(2))))
            .catch(() => { });

        const id = searchParams.get('customerId');
        if (id) {
            api.get(`/customers/${id}`).then(r => { setSelectedCustomer(r.data); loadLedger(id); }).catch(() => { });
        }
    }, []);

    const filteredCustomers = search
        ? allCustomers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.mobile && c.mobile.includes(search)))
        : allCustomers;

    const loadLedger = async (customerId: string) => {
        setLoading(true);
        try {
            const res = await api.get(`/ledger/${customerId}`);
            setEntries(res.data.entries || []);
            if (res.data.customer) setSelectedCustomer(res.data.customer);
        } catch { }
        setLoading(false);
    };

    const selectCustomer = (c: Customer) => {
        setSelectedCustomer(c);
        setSearch('');
        loadLedger(c._id);
    };

    const handleDelete = async (c: Customer) => {
        if (!window.confirm(`"${c.name}" ग्राहकाला कायमचा हटवायचा का?\n\nत्यांचे सर्व व्यवहार देखील हटवले जातील.`)) return;
        try {
            await api.delete(`/customers/${c._id}`);
            setAllCustomers(prev => prev.filter(x => x._id !== c._id));
        } catch (e: any) {
            alert(e.response?.data?.message || 'हटवताना त्रुटी झाली.');
        }
    };

    // ── Compute total payment amount ──
    const paymentTotal = (() => {
        let total = 0;
        if (paymentMode === 'Cash' || paymentMode === 'Mixed') total += parseFloat(cashAmount) || 0;
        if (paymentMode === 'UPI' || paymentMode === 'Mixed') total += parseFloat(upiAmount) || 0;
        if (paymentMode === 'Bank' || paymentMode === 'Mixed') total += parseFloat(bankAmount) || 0;
        if (paymentMode === 'Silver' || paymentMode === 'Mixed') total += silver.silverValue || 0;
        return parseFloat(total.toFixed(2));
    })();

    // ── Handle Payment Submit ──
    const handlePayment = async () => {
        if (!selectedCustomer || paymentTotal <= 0) return;
        setPaymentSaving(true);
        try {
            await api.post('/payments', {
                customerId: selectedCustomer._id,
                cashAmount: (paymentMode === 'Cash' || paymentMode === 'Mixed') ? parseFloat(cashAmount) || 0 : 0,
                upiAmount: (paymentMode === 'UPI' || paymentMode === 'Mixed') ? parseFloat(upiAmount) || 0 : 0,
                bankAmount: (paymentMode === 'Bank' || paymentMode === 'Mixed') ? parseFloat(bankAmount) || 0 : 0,
                silverGrossWeight: (paymentMode === 'Silver' || paymentMode === 'Mixed') ? silver.grossWeight : 0,
                silverPurity: (paymentMode === 'Silver' || paymentMode === 'Mixed') ? silver.purity : 0,
                silverRate: (paymentMode === 'Silver' || paymentMode === 'Mixed') ? silver.silverRate : 0,
            });
            setCashAmount(''); setUpiAmount(''); setBankAmount('');
            setSilver({ grossWeight: 0, purity: 0, fineWeight: 0, silverRate: 0, silverValue: 0 });
            setShowPayment(false);
            loadLedger(selectedCustomer._id);
            alert('पेमेंट यशस्वीरित्या नोंदवले!');
        } catch (e: any) {
            alert(e.response?.data?.message || 'पेमेंट नोंदवताना त्रुटी झाली.');
        }
        setPaymentSaving(false);
    };

    // ── Open Silver Adjustment Modal ──
    const openAdjustmentModal = async () => {
        if (!selectedCustomer) return;
        // Load customer's bills
        try {
            const res = await api.get(`/bills?customerId=${selectedCustomer._id}`);
            setCustomerBills(res.data);
            if (res.data.length > 0) setAdjBillId(res.data[0]._id);
        } catch { }
        // Auto-fill silver rate
        if (silverRatePerGram > 0) {
            setAdjSilver(prev => ({ ...prev, silverRate: silverRatePerGram }));
        }
        setShowAdjustment(true);
    };

    // ── Handle Silver Adjustment Submit ──
    const handleAdjustment = async () => {
        if (!selectedCustomer || !adjBillId) return;
        if (!adjSilver.grossWeight || !adjSilver.purity || !adjSilver.silverRate)
            return alert('कृपया सर्व चांदी तपशील भरा.');
        setAdjSaving(true);
        try {
            await api.post('/silver-adjustments', {
                billId: adjBillId,
                customerId: selectedCustomer._id,
                date: adjDate,
                grossWeight: adjSilver.grossWeight,
                purity: adjSilver.purity,
                silverRate: adjSilver.silverRate,
                notes: adjNotes,
            });
            setShowAdjustment(false);
            setAdjSilver({ grossWeight: 0, purity: 0, fineWeight: 0, silverRate: 0, silverValue: 0 });
            setAdjNotes('');
            loadLedger(selectedCustomer._id);
            alert('चांदी समायोजन यशस्वीरित्या नोंदवले!');
        } catch (e: any) {
            alert(e.response?.data?.message || 'समायोजन नोंदवताना त्रुटी झाली.');
        }
        setAdjSaving(false);
    };

    const MODES: PaymentMode[] = ['Cash', 'UPI', 'Bank', 'Silver', 'Mixed'];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold">खातेवही</h1>
                    <p className="text-muted-foreground">Customer Ledger — व्यवहार इतिहास</p>
                </div>
                {selectedCustomer && (
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={openAdjustmentModal}
                            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium">
                            <Coins className="h-4 w-4" /> चांदी समायोजन
                        </button>
                        <button onClick={() => { setShowPayment(true); setPaymentMode('Cash'); }}
                            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium">
                            <CreditCard className="h-4 w-4" /> पेमेंट घ्या
                        </button>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════
                PAYMENT MODAL
            ═══════════════════════════════ */}
            {showPayment && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold">पेमेंट घ्या — {selectedCustomer?.name}</h2>
                        <p className="text-sm text-muted-foreground">
                            शिल्लक: <strong className="text-destructive">₹{selectedCustomer?.currentBalance?.toLocaleString('en-IN')}</strong>
                        </p>

                        {/* Mode selector */}
                        <div>
                            <label className="block text-sm font-medium mb-2">पेमेंट पद्धत</label>
                            <div className="flex flex-wrap gap-2">
                                {MODES.map(mode => (
                                    <button key={mode} onClick={() => setPaymentMode(mode)}
                                        className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${paymentMode === mode ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary'}`}>
                                        {MODE_LABELS[mode]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {(paymentMode === 'Cash' || paymentMode === 'Mixed') && (
                            <div>
                                <label className="block text-sm font-medium mb-1">रोख रक्कम (₹)</label>
                                <input type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)}
                                    className="w-full border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="0" />
                            </div>
                        )}
                        {(paymentMode === 'UPI' || paymentMode === 'Mixed') && (
                            <div>
                                <label className="block text-sm font-medium mb-1">UPI रक्कम (₹)</label>
                                <input type="number" value={upiAmount} onChange={e => setUpiAmount(e.target.value)}
                                    className="w-full border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="0" />
                            </div>
                        )}
                        {(paymentMode === 'Bank' || paymentMode === 'Mixed') && (
                            <div>
                                <label className="block text-sm font-medium mb-1">बँक रक्कम (₹)</label>
                                <input type="number" value={bankAmount} onChange={e => setBankAmount(e.target.value)}
                                    className="w-full border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="0" />
                            </div>
                        )}
                        {(paymentMode === 'Silver' || paymentMode === 'Mixed') && (
                            <SilverFields silver={silver} onChange={setSilver} currentRate={silverRatePerGram} />
                        )}

                        {paymentTotal > 0 && (
                            <div className="bg-green-50 border border-green-200 rounded-md px-4 py-2 flex justify-between items-center">
                                <span className="text-sm font-medium text-green-700">एकूण पेमेंट:</span>
                                <span className="text-lg font-bold text-green-700">₹{paymentTotal.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setShowPayment(false)} className="flex-1 border border-border py-2 rounded-md hover:bg-secondary text-sm">रद्द करा</button>
                            <button onClick={handlePayment} disabled={paymentSaving || paymentTotal <= 0}
                                className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 font-medium text-sm disabled:opacity-50">
                                {paymentSaving ? 'जतन होत आहे...' : 'पेमेंट जतन करा'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════
                SILVER ADJUSTMENT MODAL
            ═══════════════════════════════ */}
            {showAdjustment && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-amber-700 flex items-center gap-2">
                            <Coins className="h-5 w-5" /> चांदी समायोजन
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {selectedCustomer?.name} — शिल्लक: <strong className="text-destructive">₹{selectedCustomer?.currentBalance?.toLocaleString('en-IN')}</strong>
                        </p>

                        {/* Bill selector */}
                        <div>
                            <label className="block text-sm font-medium mb-1">बिल निवडा *</label>
                            {customerBills.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">या ग्राहकाचे कोणतेही बिल आढळले नाही.</p>
                            ) : (
                                <select value={adjBillId} onChange={e => setAdjBillId(e.target.value)}
                                    className="w-full border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300">
                                    {customerBills.map(b => (
                                        <option key={b._id} value={b._id}>
                                            बिल #{b.billNumber} — {new Date(b.date).toLocaleDateString('mr-IN')} — शिल्लक ₹{b.remainingBalance?.toFixed(0)}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-sm font-medium mb-1">दिनांक *</label>
                            <input type="date" value={adjDate} onChange={e => setAdjDate(e.target.value)}
                                className="w-full border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300" />
                        </div>

                        {/* Silver fields */}
                        <SilverFields silver={adjSilver} onChange={setAdjSilver} currentRate={silverRatePerGram} />

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium mb-1">नोट्स</label>
                            <input type="text" value={adjNotes} onChange={e => setAdjNotes(e.target.value)}
                                className="w-full border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                placeholder="वैकल्पिक नोट्स..." />
                        </div>

                        {adjSilver.silverValue > 0 && (
                            <div className="bg-amber-50 border border-amber-300 rounded-md px-4 py-3 space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-amber-700">चांदी मूल्य (कपात होईल):</span>
                                    <strong className="text-amber-800">₹{adjSilver.silverValue.toFixed(2)}</strong>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-amber-700">नवीन शिल्लक (अंदाज):</span>
                                    <strong className="text-green-700">
                                        ₹{((selectedCustomer?.currentBalance || 0) - adjSilver.silverValue).toFixed(2)}
                                    </strong>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setShowAdjustment(false)} className="flex-1 border border-border py-2 rounded-md hover:bg-secondary text-sm">रद्द करा</button>
                            <button onClick={handleAdjustment}
                                disabled={adjSaving || !adjBillId || adjSilver.silverValue <= 0}
                                className="flex-1 bg-amber-600 text-white py-2 rounded-md hover:bg-amber-700 font-medium text-sm disabled:opacity-50">
                                {adjSaving ? 'जतन होत आहे...' : 'समायोजन जतन करा'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Search bar */}
            <div className="flex items-center border border-border rounded-md bg-white shadow-sm">
                <Search className="h-4 w-4 text-muted-foreground ml-3 flex-shrink-0" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    className="flex-1 px-3 py-2.5 focus:outline-none text-sm"
                    placeholder="नाव किंवा मोबाइल नंबरने शोधा..." />
                {search && (
                    <button onClick={() => setSearch('')} className="mr-3 text-muted-foreground hover:text-foreground text-xs">✕ साफ</button>
                )}
            </div>

            {/* Customer List */}
            {!selectedCustomer && (
                <div className="bg-white rounded-lg border border-border shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
                        <h2 className="font-semibold text-sm">सर्व ग्राहक ({filteredCustomers.length})</h2>
                    </div>
                    {listLoading ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">लोड होत आहे...</div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">कोणताही ग्राहक सापडला नाही.</div>
                    ) : (
                        <div className="divide-y divide-border">
                            {filteredCustomers.map(c => (
                                <div key={c._id} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors group">
                                    <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => selectCustomer(c)}>
                                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                                            {c.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{c.name}</p>
                                            <p className="text-xs text-muted-foreground">{c.mobile || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right cursor-pointer" onClick={() => selectCustomer(c)}>
                                            <span className={`text-sm font-bold ${c.currentBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                                ₹{c.currentBalance.toLocaleString('en-IN')}
                                            </span>
                                            {c.currentBalance > 0 && <p className="text-xs text-muted-foreground">थकबाकी</p>}
                                        </div>
                                        <button onClick={e => { e.stopPropagation(); handleDelete(c); }}
                                            className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 p-1.5 rounded transition-all"
                                            title="ग्राहक हटवा">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Customer Summary */}
            {selectedCustomer && (
                <div className="bg-white rounded-lg border-2 border-border shadow-sm p-5 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => { setSelectedCustomer(null); setEntries([]); }}
                            className="text-muted-foreground hover:text-foreground text-sm px-3 py-1.5 border border-border rounded-md hover:bg-secondary transition-colors">
                            ← मागे
                        </button>
                        <div>
                            <p className="text-sm text-muted-foreground">ग्राहकाचे नाव</p>
                            <p className="text-xl font-bold">{selectedCustomer.name}</p>
                            <p className="text-sm text-muted-foreground">{selectedCustomer.mobile}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">एकूण थकबाकी</p>
                        <p className={`text-3xl font-bold ${selectedCustomer.currentBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                            ₹{selectedCustomer.currentBalance?.toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>
            )}

            {/* Ledger Table */}
            {selectedCustomer && (
                <div className="bg-white rounded-lg border border-border shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border bg-secondary/30">
                        <h2 className="font-semibold">व्यवहार इतिहास (Transaction History)</h2>
                    </div>
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground">लोड होत आहे...</div>
                    ) : entries.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">कोणताही व्यवहार आढळला नाही.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-secondary/20">
                                        <th className="text-left px-4 py-3">दिनांक</th>
                                        <th className="text-left px-4 py-3">प्रकार</th>
                                        <th className="text-left px-4 py-3">तपशील</th>
                                        <th className="text-right px-4 py-3 text-destructive">उधार</th>
                                        <th className="text-right px-4 py-3 text-green-600">जमा</th>
                                        <th className="text-right px-4 py-3">शिल्लक</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map((e, i) => {
                                        const badge = ENTRY_BADGE[e.entryType] || { label: e.entryType, cls: 'bg-gray-100 text-gray-600 border-gray-300' };
                                        return (
                                            <tr key={e._id} className={`border-b border-border ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                    {new Date(e.date).toLocaleDateString('mr-IN')}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${badge.cls}`}>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px]">
                                                    <span className="line-clamp-2">{e.description}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {e.debit > 0 && (
                                                        <span className="flex items-center justify-end gap-1 text-destructive font-medium">
                                                            <ArrowUpCircle className="h-3.5 w-3.5" /> ₹{e.debit.toLocaleString('en-IN')}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {e.credit > 0 && (
                                                        <span className="flex items-center justify-end gap-1 text-green-600 font-medium">
                                                            <ArrowDownCircle className="h-3.5 w-3.5" /> ₹{e.credit.toLocaleString('en-IN')}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold">
                                                    ₹{e.balance.toLocaleString('en-IN')}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Ledger;
