import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import api from '../api';
import { Plus, Trash2, Save, Search, Share2, X, Download, Coins } from 'lucide-react';
import type { Customer, BillItem, PaymentMode, SilverPayment } from '../types';
import { PrintableBill } from '../components/PrintableBill';

const emptyItem = (): BillItem => ({ description: '', quantity: 1, weight: 0, touch: 0, fine: 0, rate: 0, makingCharge: 0, amount: 0 });
const MODE_LABELS: Record<PaymentMode, string> = { Cash: 'रोख', UPI: 'UPI', Bank: 'बँक', Mixed: 'मिश्र' };

// ─── Silver sub-form (used for mixed payment entry) ───
const SilverPaymentFields = ({ silver, onChange }: { silver: SilverPayment; onChange: (s: SilverPayment) => void }) => {
    const update = (field: keyof SilverPayment, value: number) => {
        const updatedSilver = { ...silver, [field]: value };
        const gw = field === 'grossWeight' ? value : updatedSilver.grossWeight;
        const pur = field === 'purity' ? value : updatedSilver.purity;
        updatedSilver.fineWeight = parseFloat(((gw * pur) / 100).toFixed(3));
        onChange(updatedSilver);
    };
    return (
        <div className="mt-3 p-4 bg-gray-50 border-2 border-primary/20 rounded-lg space-y-4">
            <p className="text-sm font-bold text-primary flex items-center gap-2">
                <Coins className="h-4 w-4" /> चांदी पेमेंट विभाग (चांदी वजा)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">एकूण चांदी वजन (g) *</label>
                    <input type="number" min={0}
                        value={silver.grossWeight || ''}
                        onChange={e => update('grossWeight', parseFloat(e.target.value) || 0)}
                        className="w-full border-2 border-gray-300 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        placeholder="0.000" />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">शुद्धता (%) *</label>
                    <input type="number" min={0} max={100}
                        value={silver.purity || ''}
                        onChange={e => update('purity', parseFloat(e.target.value) || 0)}
                        className="w-full border-2 border-gray-300 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        placeholder="80" />
                </div>
                <div>
                    <label className="text-xs font-bold text-primary block mb-1">फाइन वजन (Fine g)</label>
                    <input type="number" value={silver.fineWeight || ''} readOnly
                        className="w-full border-2 border-primary/30 rounded px-3 py-2 text-sm bg-primary/5 text-primary font-bold" />
                </div>
            </div>
            <div className="flex items-center justify-between bg-primary/10 border-2 border-primary/20 rounded px-4 py-2">
                <span className="text-sm font-bold text-primary">चांदी वजा (g):</span>
                <span className="text-xl font-black text-primary">{silver.fineWeight.toFixed(3)} g</span>
            </div>
        </div>
    );
};


const Billing = () => {
    const [searchParams] = useSearchParams();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [silverRatePerKg, setSilverRatePerKg] = useState(0);
    const [items, setItems] = useState<BillItem[]>([emptyItem()]);

    // Payment
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
    const [cashAmount, setCashAmount] = useState(0);
    const [upiAmount, setUpiAmount] = useState(0);
    const [bankAmount, setBankAmount] = useState(0);
    const [silver, setSilver] = useState<SilverPayment>({ grossWeight: 0, purity: 0, fineWeight: 0 });

    // Optional manual previous balances (auto-fills from customer, editable)
    const [manualPrevBalance, setManualPrevBalance] = useState<string>('');
    const [manualPrevFine, setManualPrevFine] = useState<string>('');

    const [saving, setSaving] = useState(false);
    const [savedBill, setSavedBill] = useState<any>(null);
    const [sharing, setSharing] = useState(false);
    const [downloading, setDownloading] = useState(false);

    // Add customer form
    const [showAddCustomer, setShowAddCustomer] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', mobile: '', address: '' });
    const [addingCustomer, setAddingCustomer] = useState(false);

    // Ref points ONLY to the clean printable bill
    const printRef = useRef<HTMLDivElement>(null);

    // ── Fetch silver rate & URL Customer ──
    useEffect(() => {
        api.get('/silver-rates')
            .then(r => setSilverRatePerKg(r.data?.rate || 0))
            .catch(() => { });
        
        const customerId = searchParams.get('customerId');
        if (customerId) {
            api.get(`/customers/${customerId}`)
                .then(r => {
                    if (r.data) selectCustomer(r.data);
                })
                .catch(() => { console.error("Failed to load customer from URL") });
        }
    }, [searchParams]);

    // ── Customer search ──
    useEffect(() => {
        if (!customerSearch) { setCustomers([]); setShowDropdown(false); return; }
        const t = setTimeout(() => {
            api.get(`/customers?keyword=${customerSearch}`)
                .then(r => { setCustomers(r.data); setShowDropdown(true); })
                .catch(() => { });
        }, 300);
        return () => clearTimeout(t);
    }, [customerSearch]);

    const selectCustomer = (c: Customer) => {
        setSelectedCustomer(c);
        setCustomerSearch(c.name);
        setShowDropdown(false);
        setShowAddCustomer(false);
        // Auto-fill previous balance from DB, user can override
        setManualPrevBalance(c.currentBalance > 0 ? String(c.currentBalance) : '');
        setManualPrevFine(c.fineBalance > 0 ? String(c.fineBalance) : '');
    };

    const handleAddNewCustomer = async () => {
        if (!newCustomer.name) return;
        setAddingCustomer(true);
        try {
            const res = await api.post('/customers', { ...newCustomer, currentBalance: 0, fineBalance: 0 });
            selectCustomer(res.data.customer || { ...res.data, currentBalance: 0, fineBalance: 0 });
            setNewCustomer({ name: '', mobile: '', address: '' });
            setShowAddCustomer(false);
        } catch (e: any) { alert(e.response?.data?.message || 'ग्राहक जोडताना त्रुटी झाली.'); }
        setAddingCustomer(false);
    };

    // ── Calculations ──
    const subtotal = items.reduce((s, i) => s + (i.amount || 0), 0);
    const totalFineWeight = items.reduce((s, i) => s + (i.fine || 0), 0);
    const previousBalance = parseFloat(manualPrevBalance || '0') || 0;
    const previousFine = parseFloat(manualPrevFine || '0') || 0;
    const totalPayable = subtotal + previousBalance;
    const effectiveCash = (paymentMode === 'Cash' || paymentMode === 'Mixed') ? cashAmount : 0;
    const effectiveUpi = (paymentMode === 'UPI' || paymentMode === 'Mixed') ? upiAmount : 0;
    const effectiveBank = (paymentMode === 'Bank' || paymentMode === 'Mixed') ? bankAmount : 0;
    const effectiveSilverWeight = (paymentMode === 'Mixed') ? silver.fineWeight : 0;

    const paidAmount = parseFloat((effectiveCash + effectiveUpi + effectiveBank).toFixed(2));
    const remainingBalance = parseFloat((totalPayable - paidAmount).toFixed(2));

    // ── Item editing ──
    const updateItem = (i: number, field: keyof BillItem, value: number | string) => {
        setItems(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], [field]: value };
            const item = updated[i];

            // Auto Calculations
            const weight = Number(item.weight) || 0;
            const touch = Number(item.touch) || 0;
            const makingChargeRate = Number(item.makingCharge) || 0;

            item.fine = parseFloat(((weight * touch) / 100).toFixed(3));
            item.amount = parseFloat((makingChargeRate * (weight / 1000)).toFixed(2));

            return updated;
        });
    };

    const resetForm = () => {
        setItems([emptyItem()]); setCashAmount(0); setUpiAmount(0); setBankAmount(0);
        setSilver({ grossWeight: 0, purity: 0, fineWeight: 0 });
        setPaymentMode('Cash'); setSelectedCustomer(null);
        setCustomerSearch(''); setManualPrevBalance(''); setManualPrevFine('');
    };

    // ── Save Bill ──
    const handleSave = async () => {
        if (!selectedCustomer) return alert('कृपया ग्राहक निवडा.');
        const validItems = items.filter(i => i.description && i.weight > 0);
        if (!validItems.length) return alert('कृपया किमान एक वस्तू जोडा.');
        if (paidAmount > totalPayable + 0.01) return alert('पेमेंट एकूण देण्यापेक्षा जास्त असू शकत नाही.');

        setSaving(true);
        try {
            // 1. Create the Bill
            const payload = {
                customerId: selectedCustomer._id,
                items: validItems,
                subtotal,
                previousBalance,
                previousFine,
                totalPayable,
                cashAmount: effectiveCash,
                upiAmount: effectiveUpi,
                bankAmount: effectiveBank
            };
            const createdBill = await api.post('/bills', payload);
            const bill = createdBill.data.bill || createdBill.data;

            // 2. Handle Silver Deduction if applicable
            if (effectiveSilverWeight > 0 && bill && bill._id) {
                await api.post('/silver-payments', {
                    customerId: selectedCustomer._id,
                    billId: bill._id,
                    grossWeight: silver.grossWeight,
                    purity: silver.purity,
                    notes: 'बिले सोबत चांदी पेमेंट (Mixed Mode)'
                });
            }

            setSavedBill(bill);
            alert(`बिल #${bill.billNumber} यशस्वीरित्या जतन केले!`);
        } catch (e: any) {
            console.error("Save error:", e);
            alert(e.response?.data?.message || 'बिल जतन करताना त्रुटी झाली.');
        }
        setSaving(false);
    };

    const captureBillCanvas = async () => {
        if (document.fonts) { await document.fonts.ready; }
        return html2canvas(printRef.current!, { 
            scale: 2.5, 
            useCORS: true, 
            backgroundColor: '#FFFDE7', 
            logging: false,
            width: 920,
            windowWidth: 920,
            onclone: (doc) => {
                const el = doc.getElementById('bill-print-wrapper');
                if (el) el.style.width = '920px';
            }
        });
    };

    // ── Download bill preview as PNG image ──
    const handleDownloadImage = async () => {
        if (!printRef.current) return;
        setDownloading(true);
        try {
            const canvas = await captureBillCanvas();
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = `bill-${savedBill?.billNumber || (selectedCustomer?.name || 'draft')}.png`;
            a.click();
        } catch (e) { console.error(e); }
        setDownloading(false);
    };
    const handleShareWhatsApp = async () => {
        if (!printRef.current) return;
        setSharing(true);
        try {
            const canvas = await captureBillCanvas();
            canvas.toBlob(async (blob) => {
                if (!blob) { setSharing(false); return; }
                const file = new File([blob], `bill-${savedBill?.billNumber || 'draft'}.png`, { type: 'image/png' });
                if (navigator.share && navigator.canShare?.({ files: [file] })) {
                    await navigator.share({ files: [file], title: `बिल - ${selectedCustomer?.name || ''}`, text: `अलंकार ज्वेलर्स — बिल` });
                } else {
                    // Desktop fallback: download image then open WhatsApp
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url;
                    a.download = `bill-${savedBill?.billNumber || 'draft'}.png`; a.click();
                    URL.revokeObjectURL(url);
                    setTimeout(() => {
                        const phone = selectedCustomer?.mobile?.replace(/\D/g, '');
                        const text = "नमस्कार,%20बिल+पाठवत+आहे+📄";
                        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

                        if (isMobile) {
                            if (phone) window.location.href = `whatsapp://send?phone=91${phone}&text=${text}`;
                            else window.location.href = `whatsapp://send?text=${text}`;
                        } else {
                            if (phone) window.open(`https://web.whatsapp.com/send?phone=91${phone}&text=${text}`, '_blank');
                            else window.open(`https://web.whatsapp.com/send?text=${text}`, '_blank');
                        }
                    }, 1200);
                }
            }, 'image/png');
        } catch (e) { console.error(e); }
        setSharing(false);
    };

    const MODES: PaymentMode[] = ['Cash', 'UPI', 'Bank', 'Mixed'];

    const billProps = {
        customer: selectedCustomer, items, subtotal, previousBalance, previousFine, totalPayable,
        cashPaid: effectiveCash, upiPaid: effectiveUpi, bankPaid: effectiveBank,
        silverPayments: effectiveSilverWeight > 0 ? [silver] : [], paymentMode, paidAmount, remainingBalance,
        billNumber: savedBill?.billNumber, billDate: savedBill?.date,
        silverRate: silverRatePerKg, totalFineWeight
    };

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">नवीन बिल</h1>
                    <p className="text-muted-foreground text-sm">New Bill Entry</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={resetForm}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1.5 border border-[#dd3355] text-[#dd3355] px-4 py-1.5 rounded hover:bg-red-50 transition text-sm font-medium bg-white">
                        <Plus className="h-4 w-4" /> नवीन बिल
                    </button>
                    <button onClick={handleShareWhatsApp} disabled={sharing}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-[#25D366] text-white px-4 py-1.5 rounded hover:bg-[#128C7E] transition disabled:opacity-50 text-sm font-medium shadow-sm border border-[#1DA851]">
                        <Share2 className="h-4 w-4" />
                        {sharing ? '...' : 'WhatsApp'}
                    </button>
                    <button onClick={handleDownloadImage} disabled={downloading}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-[#334155] text-white px-4 py-1.5 rounded hover:bg-[#1e293b] transition disabled:opacity-50 text-sm font-medium border border-slate-800">
                        <Download className="h-4 w-4" />
                        {downloading ? '...' : 'बिल डाउनलोड'}
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-[#ef4444] text-white px-4 py-1.5 rounded hover:bg-[#dc2626] transition disabled:opacity-50 text-sm font-medium border border-red-600">
                        <Save className="h-4 w-4" />
                        {saving ? '...' : 'जतन करा'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-border shadow-sm p-4 md:p-6 space-y-5">

                {/* Customer Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700">ग्राहकाचे नाव *</label>
                        <div className="relative">
                            <div className="flex items-center border-2 border-gray-300 rounded-md focus-within:border-primary">
                                <Search className="h-4 w-4 text-gray-400 ml-3 flex-shrink-0" />
                                <input type="text" value={customerSearch}
                                    onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null); setShowAddCustomer(false); }}
                                    onFocus={() => { if (customers.length > 0) setShowDropdown(true); }}
                                    className="flex-1 px-3 py-2 focus:outline-none rounded-r-md text-sm"
                                    placeholder="नाव शोधा किंवा टाका..." />
                                {customerSearch && (
                                    <button onClick={() => { setCustomerSearch(''); setSelectedCustomer(null); setShowDropdown(false); setShowAddCustomer(false); }} className="mr-2">
                                        <X className="h-4 w-4 text-gray-400 hover:text-gray-700" />
                                    </button>
                                )}
                            </div>
                            {showDropdown && (
                                <div className="absolute z-20 top-full mt-1 w-full bg-white border border-border rounded-md shadow-xl max-h-56 overflow-y-auto">
                                    {customers.map(c => (
                                        <div key={c._id} onClick={() => selectCustomer(c)}
                                            className="px-4 py-2.5 hover:bg-secondary/60 cursor-pointer flex items-center justify-between border-b border-border/40 last:border-0">
                                            <div>
                                                <span className="font-medium text-sm">{c.name}</span>
                                                {c.mobile && <span className="text-xs text-muted-foreground ml-2">{c.mobile}</span>}
                                            </div>
                                            {c.currentBalance > 0 && <span className="text-xs text-destructive font-medium">₹{c.currentBalance}</span>}
                                        </div>
                                    ))}
                                    <div onClick={() => { setShowDropdown(false); setShowAddCustomer(true); setNewCustomer(n => ({ ...n, name: customerSearch })); }}
                                        className="px-4 py-2.5 hover:bg-primary/10 cursor-pointer flex items-center gap-2 text-primary border-t border-border/60 font-medium text-sm">
                                        <Plus className="h-4 w-4" /> नवीन ग्राहक जोडा: &quot;{customerSearch}&quot;
                                    </div>
                                </div>
                            )}
                            {customerSearch && customers.length === 0 && !showDropdown && !selectedCustomer && (
                                <div className="absolute z-20 top-full mt-1 w-full bg-white border border-border rounded-md shadow-xl">
                                    <div onClick={() => { setShowAddCustomer(true); setNewCustomer(n => ({ ...n, name: customerSearch })); }}
                                        className="px-4 py-3 hover:bg-primary/10 cursor-pointer flex items-center gap-2 text-primary font-medium text-sm">
                                        <Plus className="h-4 w-4" /> नवीन जोडा: &quot;{customerSearch}&quot;
                                    </div>
                                </div>
                            )}
                        </div>
                        {showAddCustomer && (
                            <div className="mt-2 border border-primary/30 bg-primary/5 rounded-md p-3 space-y-2">
                                <p className="text-sm font-semibold text-primary">नवीन ग्राहक / सोनार नोंदणी</p>
                                <input value={newCustomer.name} onChange={e => setNewCustomer(n => ({ ...n, name: e.target.value }))}
                                    className="w-full border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="पूर्ण नाव *" />
                                <input value={newCustomer.mobile} onChange={e => setNewCustomer(n => ({ ...n, mobile: e.target.value }))}
                                    className="w-full border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="मोबाइल नंबर" type="tel" />
                                <input value={newCustomer.address} onChange={e => setNewCustomer(n => ({ ...n, address: e.target.value }))}
                                    className="w-full border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="पत्ता (वैकल्पिक)" />
                                <div className="flex gap-2">
                                    <button onClick={() => setShowAddCustomer(false)} className="flex-1 border border-border py-1.5 rounded text-sm hover:bg-secondary">रद्द</button>
                                    <button onClick={handleAddNewCustomer} disabled={addingCustomer || !newCustomer.name}
                                        className="flex-1 bg-primary text-primary-foreground py-1.5 rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                                        {addingCustomer ? 'जोडत आहे...' : 'जोडा आणि निवडा'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-gray-700">मोबाइल नंबर</label>
                            <input value={selectedCustomer?.mobile || ''} readOnly
                                className="w-full border border-border rounded-md px-3 py-2 bg-secondary/30 text-muted-foreground text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm font-semibold mb-1 text-gray-700 text-xs">
                                    मागील बाकी (₹) <span className="font-normal text-muted-foreground ml-1">(देणे)</span>
                                </label>
                                <input
                                    type="number" min={0}
                                    value={manualPrevBalance}
                                    onChange={e => setManualPrevBalance(e.target.value)}
                                    placeholder="0"
                                    className="w-full border-2 border-orange-300 focus:border-orange-500 rounded-md px-3 py-1.5 text-sm focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1 text-gray-700 text-xs">
                                    मागील फाइन (g) <span className="font-normal text-muted-foreground ml-1">(येणे)</span>
                                </label>
                                <input
                                    type="number" min={0}
                                    value={manualPrevFine}
                                    onChange={e => setManualPrevFine(e.target.value)}
                                    placeholder="0"
                                    className="w-full border-2 border-blue-300 focus:border-blue-500 rounded-md px-3 py-1.5 text-sm focus:outline-none" />
                            </div>
                        </div>
                    </div>

                    {/* ── Items — MOBILE: vertical cards ── */}
                    <div className="space-y-3 md:hidden">
                        {items.map((item, i) => (
                            <div key={i} className="border-2 border-primary/30 rounded-lg p-3 space-y-2 bg-white shadow-sm">
                                {/* Row header */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-primary uppercase tracking-wide">वस्तू #{i + 1}</span>
                                    <button onClick={() => setItems(prev => prev.length > 1 ? prev.filter((_, j) => j !== i) : prev)}
                                        className="text-destructive hover:bg-destructive/10 p-1.5 rounded-md">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">तपशील (वस्तूचे नाव)</label>
                                    <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                                        className="w-full border-2 border-gray-200 focus:border-primary rounded-md px-3 py-2 text-sm focus:outline-none"
                                        placeholder="उदा. पैजण, तोडा, बांगडी..." />
                                </div>

                                {/* नग + वजन */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">नग (qty)</label>
                                        <input type="number" value={item.quantity || ''} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                                            className="w-full border-2 border-gray-200 focus:border-primary rounded-md px-3 py-2 text-sm focus:outline-none text-right" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">वजन (g)</label>
                                        <input type="number" value={item.weight || ''} onChange={e => updateItem(i, 'weight', parseFloat(e.target.value) || 0)}
                                            className="w-full border-2 border-gray-200 focus:border-primary rounded-md px-3 py-2 text-sm focus:outline-none text-right" />
                                    </div>
                                </div>

                                {/* टंच + फाइन (auto) */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">टंच %</label>
                                        <input type="number" value={item.touch || ''} onChange={e => updateItem(i, 'touch', parseFloat(e.target.value) || 0)}
                                            className="w-full border-2 border-gray-200 focus:border-primary rounded-md px-3 py-2 text-sm focus:outline-none text-right" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">फाइन (g) <span className="text-primary font-normal">— auto</span></label>
                                        <input type="number" value={item.fine || ''} readOnly
                                            className="w-full border-2 border-primary/20 rounded-md px-3 py-2 text-sm bg-primary/5 text-primary font-bold text-right" />
                                    </div>
                                </div>

                                {/* मजुरी */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">मजुरी (₹/g)</label>
                                    <input type="number" value={item.makingCharge || ''} onChange={e => updateItem(i, 'makingCharge', parseFloat(e.target.value) || 0)}
                                        className="w-full border-2 border-gray-200 focus:border-primary rounded-md px-3 py-2 text-sm focus:outline-none text-right" />
                                </div>

                                {/* रक्कम — full width, prominent */}
                                <div className="bg-primary/10 rounded-md px-4 py-2 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-primary">रक्कम:</span>
                                    <span className="text-xl font-bold text-primary">₹{item.amount.toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Items — DESKTOP: horizontal table ── */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-xs md:text-sm border-2 border-primary min-w-[700px]">
                            <thead>
                                <tr className="bg-primary/10">
                                    {['तपशील', 'नग', 'वजन', 'टंच%', 'फाइन', 'मजुरी₹', 'रक्कम₹', ''].map(h => (
                                        <th key={h} className="border border-primary/40 px-2 py-2 text-center text-primary font-semibold whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, i) => (
                                    <tr key={i} className="hover:bg-secondary/20">
                                        <td className="border border-primary/30 p-1">
                                            <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                                                className="w-full px-2 py-1 focus:outline-none min-w-[100px] text-sm" placeholder="नाव" />
                                        </td>
                                        {(['quantity', 'weight', 'touch', 'fine', 'makingCharge', 'amount'] as (keyof BillItem)[]).map(field => (
                                            <td key={field} className="border border-primary/30 p-1">
                                                <input type="number"
                                                    value={(item[field] as number) || ''}
                                                    onChange={e => updateItem(i, field, parseFloat(e.target.value) || 0)}
                                                    readOnly={field === 'fine' || field === 'amount'}
                                                    className={`w-full px-1 py-1 text-right focus:outline-none min-w-[60px] text-sm ${field === 'fine' || field === 'amount' ? 'bg-secondary/40 text-muted-foreground font-semibold' : ''}`} />
                                            </td>
                                        ))}
                                        <td className="border border-primary/30 p-1 text-center">
                                            <button onClick={() => setItems(prev => prev.length > 1 ? prev.filter((_, j) => j !== i) : prev)}
                                                className="text-destructive hover:bg-destructive/10 p-1 rounded">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <button onClick={() => setItems(p => [...p, emptyItem()])}
                        className="flex items-center gap-2 text-primary hover:bg-primary/10 px-3 py-2 rounded-md transition-colors text-sm">
                        <Plus className="h-4 w-4" /> ओळ जोडा
                    </button>


                    {/* Payment Mode */}
                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-700">पेमेंट पद्धत निवडा</label>
                        <div className="flex flex-wrap gap-2">
                            {MODES.map(mode => (
                                <button key={mode} onClick={() => setPaymentMode(mode)}
                                    className={`px-4 py-1.5 rounded-full border-2 text-sm font-semibold transition-all ${paymentMode === mode ? 'bg-primary text-primary-foreground border-primary' : 'border-gray-300 text-gray-600 hover:border-primary'}`}>
                                    {MODE_LABELS[mode]}
                                </button>
                            ))}
                        </div>
                        {(paymentMode === 'Cash' || paymentMode === 'Mixed') && (
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-gray-700 w-36">रोख रक्कम (₹):</label>
                                <input type="number" min={0} value={cashAmount || ''}
                                    onChange={e => setCashAmount(parseFloat(e.target.value) || 0)}
                                    className="border-2 border-green-300 rounded px-3 py-1.5 text-sm w-40 focus:outline-none focus:border-green-500" placeholder="0" />
                            </div>
                        )}
                        {(paymentMode === 'UPI' || paymentMode === 'Mixed') && (
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-gray-700 w-36">UPI रक्कम (₹):</label>
                                <input type="number" min={0} value={upiAmount || ''}
                                    onChange={e => setUpiAmount(parseFloat(e.target.value) || 0)}
                                    className="border-2 border-blue-300 rounded px-3 py-1.5 text-sm w-40 focus:outline-none focus:border-blue-500" placeholder="0" />
                            </div>
                        )}
                        {(paymentMode === 'Bank' || paymentMode === 'Mixed') && (
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-gray-700 w-36">बँक रक्कम (₹):</label>
                                <input type="number" min={0} value={bankAmount || ''}
                                    onChange={e => setBankAmount(parseFloat(e.target.value) || 0)}
                                    className="border-2 border-purple-300 rounded px-3 py-1.5 text-sm w-40 focus:outline-none focus:border-purple-500" placeholder="0" />
                            </div>
                        )}
                        {paymentMode === 'Mixed' && (
                            <SilverPaymentFields silver={silver} onChange={setSilver} />
                        )}
                    </div>

                    {/* Quick totals below form */}
                    <div className="flex justify-end">
                        <div className="border border-border rounded-lg p-4 space-y-1.5 min-w-[240px] bg-secondary/20">
                            <div className="flex justify-between text-sm"><span>एकूण रक्कम:</span><strong>₹{subtotal.toFixed(2)}</strong></div>
                            {previousBalance > 0 && <div className="flex justify-between text-sm text-destructive"><span>मागील थकबाकी:</span><strong>₹{previousBalance.toFixed(2)}</strong></div>}
                            <div className="flex justify-between text-sm font-semibold border-t pt-1.5"><span>एकूण देणे:</span><span className="text-primary">₹{totalPayable.toFixed(2)}</span></div>
                            {paidAmount > 0 && <div className="flex justify-between text-sm text-green-700"><span>दिलेली रक्कम:</span><strong>₹{paidAmount.toFixed(2)}</strong></div>}
                            <div className="flex justify-between text-base font-bold border-t-2 pt-1.5"><span>शिल्लक:</span><span className={remainingBalance > 0 ? 'text-destructive' : 'text-green-600'}>₹{remainingBalance.toFixed(2)}</span></div>
                        </div>
                    </div>
                </div>

                <div>
                    <p className="text-xs text-muted-foreground mb-2 text-center">WhatsApp Bill Preview</p>
                    {/* Scroll wrapper on mobile so user can see the full bill */}
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                        <div style={{ width: '920px', minWidth: '920px' }}>
                            <div id="bill-print-wrapper" ref={printRef} style={{ display: 'inline-block', width: '920px', backgroundColor: '#FFFDE7' }}>
                                <PrintableBill {...billProps} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Billing;
