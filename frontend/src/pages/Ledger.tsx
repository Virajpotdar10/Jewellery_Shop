import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import api from '../api';
import {
    Search, ArrowUpCircle, ArrowDownCircle, CreditCard, Trash2, Coins, X, Plus, Share2
} from 'lucide-react';
import type { Customer, SilverPayment, PaymentMode } from '../types';
import { PrintableBill } from '../components/PrintableBill';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface LedgerEntry {
    _id: string; date: string; description: string; refId?: string;
    credit: number; debit: number; balance: number; entryType: string;
}
interface Bill { _id: string; billNumber: number; date: string; remainingBalance: number; totalPayable: number; items: any[]; subtotal: number; previousBalance: number; previousFine?: number; paymentBreakdown: any; silverRateUsed: number; totalFineWeight: number; }

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

const MODE_LABELS: Record<PaymentMode, string> = {
    Cash: 'रोख', UPI: 'UPI', Bank: 'बँक', Mixed: 'मिश्र',
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

    const [showPayment, setShowPayment] = useState(false);
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
    const [cashAmount, setCashAmount] = useState('');
    const [upiAmount, setUpiAmount] = useState('');
    const [bankAmount, setBankAmount] = useState('');
    const [paymentSaving, setPaymentSaving] = useState(false);

    // ── View Bill & Silver Post-Payment ──
    const [viewBill, setViewBill] = useState<Bill | null>(null);
    const [billSilverPayments, setBillSilverPayments] = useState<SilverPayment[]>([]);
    const [addSilver, setAddSilver] = useState({ grossWeight: 0, purity: 0 });
    const [adjSaving, setAdjSaving] = useState(false);
    const [sharing, setSharing] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    // ── Post-Bill Rupee Payment ──
    const [addRupee, setAddRupee] = useState({ cash: 0, upi: 0, bank: 0 });
    const [rupeeSaving, setRupeeSaving] = useState(false);

    // ── Capture printRef as image ──
    const captureBillCanvas = () => html2canvas(printRef.current!, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#FFFDE7',
        logging: false
    });

    const handleShareWhatsApp = async () => {
        if (!printRef.current || !selectedCustomer || !viewBill) return;
        setSharing(true);
        try {
            const canvas = await captureBillCanvas();
            canvas.toBlob(async (blob) => {
                if (!blob) { setSharing(false); return; }
                const file = new File([blob], `bill-${viewBill.billNumber}.png`, { type: 'image/png' });

                if (navigator.share && navigator.canShare?.({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: `बिल - ${selectedCustomer.name}`,
                        text: `अलंकार ज्वेलर्स — बिल`
                    });
                } else {
                    // Desktop fallback
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url;
                    a.download = `bill-${viewBill.billNumber}.png`; a.click();
                    URL.revokeObjectURL(url);

                    setTimeout(() => {
                        const phone = selectedCustomer.mobile?.replace(/\D/g, '');
                        if (phone) window.open(`https://wa.me/91${phone}?text=नमस्कार,%20बिल+पाठवत+आहे+📄`, '_blank');
                        else window.open('https://web.whatsapp.com', '_blank');
                    }, 1200);
                }
            }, 'image/png');
        } catch (e) {
            console.error(e);
            alert('WhatsApp वर शेअर करताना त्रुटी आली.');
        }
        setSharing(false);
    };

    // ── Load all customers ──
    useEffect(() => {
        setListLoading(true);
        api.get('/customers').then(r => setAllCustomers(r.data)).catch(() => { }).finally(() => setListLoading(false));

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
            });
            setCashAmount(''); setUpiAmount(''); setBankAmount('');
            setShowPayment(false);
            loadLedger(selectedCustomer._id);
            alert('पेमेंट यशस्वीरित्या नोंदवले!');
        } catch (e: any) {
            alert(e.response?.data?.message || 'पेमेंट नोंदवताना त्रुटी झाली.');
        }
        setPaymentSaving(false);
    };

    // ── Open View Bill Modal ──
    const openViewBill = async (billId?: string) => {
        if (!selectedCustomer || !billId) return;
        try {
            const billRes = await api.get(`/bills/${billId}`);
            const paymentsRes = await api.get(`/silver-payments/${selectedCustomer._id}`);

            setViewBill(billRes.data);
            setBillSilverPayments(paymentsRes.data.filter((p: any) => p.billId === billId));
            setAddSilver({ grossWeight: 0, purity: 0 });
        } catch (e) {
            alert('बिल उघडताना त्रुटी आली.');
        }
    };

    // ── Handle Silver Adjustment Submit ──
    const handleAddSilverPayment = async () => {
        if (!selectedCustomer || !viewBill) return;
        if (!addSilver.grossWeight || !addSilver.purity)
            return alert('कृपया सर्व चांदी तपशील भरा.');

        setAdjSaving(true);
        try {
            await api.post('/silver-payments', {
                billId: viewBill._id,
                customerId: selectedCustomer._id,
                grossWeight: addSilver.grossWeight,
                purity: addSilver.purity,
                notes: 'Post-bill silver payment'
            });

            // Refresh bill view and ledger
            alert('चांदी पेमेंट यशस्वीरित्या नोंदवले!');
            openViewBill(viewBill._id);
            loadLedger(selectedCustomer._id);
            setAddSilver({ grossWeight: 0, purity: 0 });
        } catch (e: any) {
            alert(e.response?.data?.message || 'पेमेंट नोंदवताना त्रुटी झाली.');
        }
        setAdjSaving(false);
    };

    const handleAddRupeePayment = async () => {
        if (!selectedCustomer || !viewBill) return;
        const total = (addRupee.cash || 0) + (addRupee.upi || 0) + (addRupee.bank || 0);
        if (total <= 0) return alert('कृपया किमान रक्कम भरा.');

        setRupeeSaving(true);
        try {
            await api.post('/payments', {
                customerId: selectedCustomer._id,
                billId: viewBill._id,
                cashAmount: addRupee.cash || 0,
                upiAmount: addRupee.upi || 0,
                bankAmount: addRupee.bank || 0,
                notes: 'बिलासाठी नंतर जमा केलेले पेमेंट'
            });

            alert('पेमेंट यशस्वीरित्या नोंदवले!');
            openViewBill(viewBill._id);
            loadLedger(selectedCustomer._id);
            setAddRupee({ cash: 0, upi: 0, bank: 0 });
        } catch (e: any) {
            alert(e.response?.data?.message || 'पेमेंट नोंदवताना त्रुटी झाली.');
        }
        setRupeeSaving(false);
    };

    const MODES: PaymentMode[] = ['Cash', 'UPI', 'Bank', 'Mixed'];

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
                VIEW BILL MODAL
            ═══════════════════════════════ */}
            {viewBill && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-0 sm:p-4">
                    <div className="bg-white sm:rounded-xl shadow-2xl w-full max-w-[1240px] flex flex-col h-full sm:h-auto sm:max-h-[96vh]">
                        <div className="p-3 sm:p-4 border-b flex justify-between items-center bg-gray-50 sm:rounded-t-xl shrink-0">
                            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                                👁️ बिल पूर्वावलोकन <span className="text-muted-foreground text-sm font-normal">#{viewBill.billNumber}</span>
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleShareWhatsApp}
                                    disabled={sharing}
                                    className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 transition disabled:opacity-50 text-xs font-bold"
                                >
                                    <Share2 className="h-4 w-4" /> {sharing ? 'तयार होत आहे...' : 'WhatsApp वर पाठवा'}
                                </button>
                                <button onClick={() => setViewBill(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="h-5 w-5" /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col xl:flex-row gap-6">
                            {/* TOP: Printable Bill Preview (Shows at TOP on mobile) */}
                            <div className="w-full xl:flex-1 overflow-x-auto bg-gray-50 p-2 sm:p-4 rounded-lg flex justify-center border border-dashed border-gray-300 min-h-[300px]">
                                <style>{`
                                    @media (max-width: 480px) { .responsive-bill { zoom: 0.58; transform: scale(0.58); transform-origin: top center; } }
                                    @media (min-width: 481px) and (max-width: 640px) { .responsive-bill { zoom: 0.65; } }
                                    @media (min-width: 641px) and (max-width: 1024px) { .responsive-bill { zoom: 0.72; } }
                                    @media (min-width: 1025px) { .responsive-bill { zoom: 0.85; } }
                                    
                                    /* Firefox fallback for zoom */
                                    @-moz-document url-prefix() {
                                        @media (max-width: 480px) { .responsive-bill { transform: scale(0.58); transform-origin: top center; } }
                                        @media (min-width: 481px) and (max-width: 640px) { .responsive-bill { transform: scale(0.65); transform-origin: top center; } }
                                        @media (min-width: 641px) and (max-width: 1024px) { .responsive-bill { transform: scale(0.72); transform-origin: top center; } }
                                        @media (min-width: 1025px) { .responsive-bill { transform: scale(0.85); transform-origin: top center; } }
                                    }
                                `}</style>
                                <div className="responsive-bill shadow-md bg-white" style={{ margin: '0 auto' }} ref={printRef}>
                                    <PrintableBill
                                        customer={selectedCustomer}
                                        items={viewBill.items}
                                        subtotal={viewBill.subtotal}
                                        previousBalance={viewBill.previousBalance}
                                        previousFine={viewBill.previousFine}
                                        totalPayable={viewBill.totalPayable}
                                        cashPaid={viewBill.paymentBreakdown?.cashPaid || 0}
                                        upiPaid={viewBill.paymentBreakdown?.upiPaid || 0}
                                        bankPaid={viewBill.paymentBreakdown?.bankPaid || 0}
                                        silverPayments={billSilverPayments}
                                        remainingBalance={viewBill.remainingBalance}
                                        billNumber={viewBill.billNumber}
                                        billDate={viewBill.date}
                                        silverRate={viewBill.silverRateUsed}
                                        totalFineWeight={viewBill.totalFineWeight}
                                    />
                                </div>
                            </div>

                            {/* BOTTOM: Forms Container (Shows below bill on mobile) */}
                            <div className="flex flex-col gap-6 w-full xl:w-[340px] shrink-0 xl:sticky xl:top-0 pb-10">
                                {/* Left: Add Silver Payment Form */}
                                <div className="border rounded-lg p-4 sm:p-5 bg-amber-50 shadow-sm flex flex-col gap-4">
                                    <h3 className="font-bold flex items-center gap-2 text-amber-800 border-b border-amber-200 pb-2">
                                        <Coins className="h-5 w-5" /> चांदी जमा करा
                                    </h3>
                                    <p className="text-xs text-amber-700 leading-tight">बिलाच्या फाइन वजनामध्ये चांदी जमा करण्यासाठी खालील माहिती भरा.</p>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">एकूण चांदी वजन (g) *</label>
                                        <input type="number" min={0} value={addSilver.grossWeight || ''} onChange={e => setAddSilver({ ...addSilver, grossWeight: parseFloat(e.target.value) || 0 })} className="w-full border border-amber-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="उदा. 73.000" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">शुद्धता (%) *</label>
                                        <input type="number" min={0} max={100} value={addSilver.purity || ''} onChange={e => setAddSilver({ ...addSilver, purity: parseFloat(e.target.value) || 0 })} className="w-full border border-amber-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="उदा. 75" />
                                    </div>
                                    <div className="bg-white border border-amber-200 rounded p-3 flex justify-between items-center">
                                        <span className="text-sm font-bold text-gray-600">फाइन (g):</span>
                                        <span className="text-lg font-black text-amber-600">{((addSilver.grossWeight * addSilver.purity) / 100).toFixed(3)} g</span>
                                    </div>

                                    <button
                                        onClick={handleAddSilverPayment}
                                        disabled={adjSaving || !addSilver.grossWeight || !addSilver.purity}
                                        className="w-full bg-amber-600 text-white font-bold py-2.5 rounded-md hover:bg-amber-700 transition disabled:opacity-50 mt-2">
                                        {adjSaving ? 'जतन करत आहे...' : 'चांदी पेमेंट जोडा'}
                                    </button>
                                </div>

                                {/* Left: Add Rupee Payment Form */}
                                <div className="w-full xl:w-[340px] border rounded-lg p-4 sm:p-5 bg-blue-50 shadow-sm shrink-0 flex flex-col gap-4">
                                    <h3 className="font-bold flex items-center gap-2 text-blue-800 border-b border-blue-200 pb-2">
                                        <CreditCard className="h-5 w-5" /> रोख पेमेंट जमा करा
                                    </h3>
                                    <p className="text-xs text-blue-700 leading-tight">बिलाच्या उधारीवर रोख रक्कम भरायची असल्यास खालील माहिती भरा.</p>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">रोख रक्कम (₹)</label>
                                            <input type="number" min={0} value={addRupee.cash || ''} onChange={e => setAddRupee({ ...addRupee, cash: parseFloat(e.target.value) || 0 })} className="w-full border border-blue-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">UPI रक्कम (₹)</label>
                                            <input type="number" min={0} value={addRupee.upi || ''} onChange={e => setAddRupee({ ...addRupee, upi: parseFloat(e.target.value) || 0 })} className="w-full border border-blue-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                                        </div>
                                        <div className="bg-white border border-blue-200 rounded p-3 flex justify-between items-center">
                                            <span className="text-sm font-bold text-gray-600">एकूण जमा (₹):</span>
                                            <span className="text-lg font-black text-blue-700">{((addRupee.cash || 0) + (addRupee.upi || 0) + (addRupee.bank || 0)).toLocaleString('en-IN')}</span>
                                        </div>

                                        <button
                                            onClick={handleAddRupeePayment}
                                            disabled={rupeeSaving || ((addRupee.cash || 0) + (addRupee.upi || 0) + (addRupee.bank || 0)) <= 0}
                                            className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-md hover:bg-blue-700 transition disabled:opacity-50 mt-2">
                                            {rupeeSaving ? 'जतन करत आहे...' : 'पेमेंट जमा करा'}
                                        </button>
                                    </div>
                                </div>
                            </div>
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

            {/* Actions Bar (when customer selected) */}
            {selectedCustomer && (
                <div className="flex justify-end gap-3">
                    <a href={`/billing?customerId=${selectedCustomer._id}&customerName=${selectedCustomer.name}`}
                        className="bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary/90 transition shadow-sm font-bold flex items-center gap-2">
                        <Plus className="h-5 w-5" /> प्लस नवीन बिल
                    </a>
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
                                                    {e.entryType === 'BILL' && e.refId && (
                                                        <button onClick={() => openViewBill(e.refId)} className="mt-1 flex items-center gap-1 text-primary hover:text-primary/80 hover:underline font-semibold text-xs">
                                                            👁️ बिल पहा (चांदी जमा करा)
                                                        </button>
                                                    )}
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
