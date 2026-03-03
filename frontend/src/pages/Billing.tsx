import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import api from '../api';
import { Plus, Trash2, Save, Search, Share2, X, Download, Coins } from 'lucide-react';

// ─── Types ───
interface Customer { _id: string; name: string; mobile: string; currentBalance: number; address?: string; }
interface BillItem { description: string; quantity: number; weight: number; touch: number; fine: number; rate: number; makingCharge: number; amount: number; }
interface SilverPayment { grossWeight: number; purity: number; fineWeight: number; silverRate: number; silverValue: number; }
type PaymentMode = 'Cash' | 'UPI' | 'Bank' | 'Silver' | 'Mixed';

const emptySilver = (): SilverPayment => ({ grossWeight: 0, purity: 0, fineWeight: 0, silverRate: 0, silverValue: 0 });
const emptyItem = (): BillItem => ({ description: '', quantity: 1, weight: 0, touch: 0, fine: 0, rate: 0, makingCharge: 0, amount: 0 });
const MODE_LABELS: Record<PaymentMode, string> = { Cash: 'रोख', UPI: 'UPI', Bank: 'बँक', Silver: 'चांदी', Mixed: 'मिश्र' };

// ─── Silver sub-form (used for payment entry) ───
const SilverPaymentFields = ({ silver, onChange, currentRate }: { silver: SilverPayment; onChange: (s: SilverPayment) => void; currentRate: number }) => {
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
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg space-y-3">
            <p className="text-sm font-semibold text-yellow-800 flex items-center gap-2"><Coins className="h-4 w-4" /> चांदी पेमेंट तपशील</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                    { label: 'एकूण वजन (ग्रॅम) *', field: 'grossWeight' as const, placeholder: '0' },
                    { label: 'शुद्धता % *', field: 'purity' as const, placeholder: '80' },
                ].map(({ label, field, placeholder }) => (
                    <div key={field}>
                        <label className="text-xs text-yellow-700 font-medium block mb-1">{label}</label>
                        <input type="number" min={0} max={field === 'purity' ? 100 : undefined}
                            value={(silver[field] as number) || ''}
                            onChange={e => update(field, parseFloat(e.target.value) || 0)}
                            className="w-full border border-yellow-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                            placeholder={placeholder} />
                    </div>
                ))}
                <div>
                    <label className="text-xs text-yellow-700 font-medium block mb-1">फाइन वजन (g)</label>
                    <input type="number" value={silver.fineWeight || ''} readOnly className="w-full border border-yellow-200 rounded px-2 py-1.5 text-sm bg-yellow-100 text-yellow-800 font-semibold" />
                </div>
                <div>
                    <label className="text-xs text-yellow-700 font-medium block mb-1">चांदी दर ₹/g *</label>
                    <input type="number" min={0} value={silver.silverRate || ''}
                        onChange={e => update('silverRate', parseFloat(e.target.value) || 0)}
                        onFocus={() => { if (!silver.silverRate && currentRate) update('silverRate', currentRate); }}
                        className="w-full border border-yellow-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        placeholder={String(currentRate)} />
                </div>
            </div>
            <div className="flex items-center justify-between bg-yellow-100 border border-yellow-300 rounded px-3 py-2">
                <span className="text-sm text-yellow-700 font-medium">चांदी मूल्य:</span>
                <span className="text-lg font-bold text-yellow-900">₹{silver.silverValue.toFixed(2)}</span>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════
//  PRINTABLE BILL — only this gets captured/printed
// ═══════════════════════════════════════════════════
const PrintableBill = ({
    customer, items, subtotal, previousBalance, totalPayable,
    cashPaid, upiPaid, bankPaid, silver, paymentMode, paidAmount, remainingBalance,
    billNumber, billDate,
}: {
    customer: Customer | null; items: BillItem[]; subtotal: number;
    previousBalance: number; totalPayable: number;
    cashPaid: number; upiPaid: number; bankPaid: number;
    silver: SilverPayment; paymentMode: PaymentMode;
    paidAmount: number; remainingBalance: number;
    billNumber?: number; billDate?: string;
}) => {
    const effectiveSilver = (paymentMode === 'Silver' || paymentMode === 'Mixed') ? silver.silverValue : 0;
    const effectiveCash = (paymentMode === 'Cash' || paymentMode === 'Mixed') ? cashPaid : 0;
    const effectiveUpi = (paymentMode === 'UPI' || paymentMode === 'Mixed') ? upiPaid : 0;
    const effectiveBank = (paymentMode === 'Bank' || paymentMode === 'Mixed') ? bankPaid : 0;

    // Landscape-style: compact cells, side-by-side bottom layout
    const tdStyle: React.CSSProperties = { border: '1px solid #C62828', padding: '7px 9px', textAlign: 'right', fontSize: '14px', whiteSpace: 'nowrap' };
    const thStyle: React.CSSProperties = { border: '1px solid #B71C1C', padding: '8px 9px', backgroundColor: '#C62828', color: '#fff', fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap' };

    return (
        <div style={{
            fontFamily: "'Mukta', 'Noto Sans Devanagari', sans-serif",
            backgroundColor: '#FFFDE7',
            border: '3px solid #C62828',
            borderRadius: '10px',
            padding: '20px 24px',
            // FIXED width — columns never collapse, always a landscape image
            width: '920px',
            minWidth: '920px',
            boxSizing: 'border-box',
        }}>
            {/* Google font */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Mukta:wght@400;600;700;800&display=swap');
                @media print {
                    @page { size: A4 landscape; margin: 8mm; }
                }
            `}</style>

            {/* ── Header: 3-column (date | shop | bill no) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', borderBottom: '2.5px solid #C62828', paddingBottom: '12px', marginBottom: '14px', gap: '12px' }}>
                <div style={{ fontSize: '13px', color: '#777' }}>
                    <div>दिनांक: <strong>{billDate || new Date().toLocaleDateString('mr-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong></div>
                    {billNumber && <div style={{ color: '#C62828', fontWeight: '700', fontSize: '14px', marginTop: '2px' }}>बिल क्र. #{billNumber}</div>}
                </div>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#C62828', margin: '0 0 2px' }}>अलंकार ज्वेलर्स</h1>
                    <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>हुपरी, कोल्हापूर</p>
                </div>
                {/* Customer info — top right */}
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '11px', color: '#888', margin: '0 0 1px' }}>ग्राहकाचे नाव</p>
                    <p style={{ fontSize: '18px', fontWeight: '800', color: '#222', margin: 0 }}>{customer?.name || '—'}</p>
                    {customer?.mobile && <p style={{ fontSize: '12px', color: '#555', margin: '1px 0 0' }}>📞 {customer.mobile}</p>}
                    {previousBalance > 0 && (
                        <p style={{ fontSize: '13px', fontWeight: '700', color: '#C62828', margin: '4px 0 0' }}>मागील थकबाकी: ₹{previousBalance.toLocaleString('en-IN')}</p>
                    )}
                </div>
            </div>

            {/* ── Items Table — full width, no overflow ── */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', tableLayout: 'fixed' }}>
                <colgroup>
                    <col style={{ width: '22%' }} /> {/* तपशील */}
                    <col style={{ width: '5%' }} />  {/* नग */}
                    <col style={{ width: '9%' }} />  {/* वजन */}
                    <col style={{ width: '8%' }} />  {/* टंच% */}
                    <col style={{ width: '10%' }} /> {/* फाइन */}
                    <col style={{ width: '12%' }} /> {/* दर */}
                    <col style={{ width: '12%' }} /> {/* मजुरी */}
                    <col style={{ width: '14%' }} /> {/* रक्कम */}
                    <col style={{ width: '8%' }} />  {/* एकूण label */}
                </colgroup>
                <thead>
                    <tr>
                        {['तपशील', 'नग', 'वजन (g)', 'टंच%', 'फाइन (g)', 'दर (₹)', 'मजुरी (₹)', 'रक्कम (₹)'].map((h, i) => (
                            <th key={i} style={{ ...thStyle, textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {items.filter(it => it.description || it.weight > 0).map((item, i) => (
                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#FFFDE7' : '#FFF8E1' }}>
                            <td style={{ ...tdStyle, textAlign: 'left', fontWeight: '700', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description || '—'}</td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>{item.quantity}</td>
                            <td style={tdStyle}>{item.weight}</td>
                            <td style={tdStyle}>{item.touch}</td>
                            <td style={{ ...tdStyle, fontWeight: '700', color: '#C62828' }}>{item.fine.toFixed(3)}</td>
                            <td style={tdStyle}>{item.rate}</td>
                            <td style={tdStyle}>{item.makingCharge}</td>
                            <td style={{ ...tdStyle, fontWeight: '800', fontSize: '15px', color: '#1a1a1a' }}>₹{item.amount.toFixed(2)}</td>
                        </tr>
                    ))}
                    {/* Empty rows to pad short bills */}
                    {items.filter(it => it.description || it.weight > 0).length < 3 &&
                        Array.from({ length: 3 - items.filter(it => it.description || it.weight > 0).length }).map((_, i) => (
                            <tr key={`empty-${i}`} style={{ backgroundColor: i % 2 === 0 ? '#FFFDE7' : '#FFF8E1' }}>
                                {Array.from({ length: 8 }).map((_, j) => (
                                    <td key={j} style={{ ...tdStyle, height: '34px', color: 'transparent' }}>—</td>
                                ))}
                            </tr>
                        ))
                    }
                </tbody>
                <tfoot>
                    <tr style={{ backgroundColor: '#FFCCBC' }}>
                        <td colSpan={7} style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', fontSize: '14px', paddingRight: '16px' }}>एकूण वस्तू रक्कम →</td>
                        <td style={{ ...tdStyle, fontWeight: '800', fontSize: '17px', color: '#C62828' }}>₹{subtotal.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>

            {/* ── Bottom: Payment Summary ── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ minWidth: '320px', border: '2px solid #C62828', borderRadius: '10px', padding: '14px 18px', backgroundColor: '#FFF3E0' }}>
                    <p style={{ textAlign: 'center', fontWeight: '800', color: '#C62828', fontSize: '14px', margin: '0 0 10px', letterSpacing: '0.5px' }}>💰 रक्कम तपशील</p>

                    {[
                        previousBalance > 0 ? { label: 'मागील थकबाकी:', val: `₹${previousBalance.toFixed(2)}`, color: '#C62828' } : null,
                        { label: 'वस्तूंची रक्कम:', val: `₹${subtotal.toFixed(2)}`, color: '#333' },
                    ].filter(Boolean).map((row, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px', color: row!.color }}>
                            <span>{row!.label}</span><strong>{row!.val}</strong>
                        </div>
                    ))}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', borderTop: '1.5px solid #C62828', paddingTop: '7px', marginBottom: '8px', fontWeight: '800', color: '#C62828' }}>
                        <span>एकूण देणे:</span><span>₹{totalPayable.toFixed(2)}</span>
                    </div>

                    {effectiveCash > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#2e7d32', marginBottom: '4px' }}><span>✓ रोख दिले:</span><strong>₹{effectiveCash.toFixed(2)}</strong></div>}
                    {effectiveUpi > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#1565c0', marginBottom: '4px' }}><span>✓ UPI दिले:</span><strong>₹{effectiveUpi.toFixed(2)}</strong></div>}
                    {effectiveBank > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6a1b9a', marginBottom: '4px' }}><span>✓ बँक दिले:</span><strong>₹{effectiveBank.toFixed(2)}</strong></div>}
                    {effectiveSilver > 0 && (
                        <div style={{ marginBottom: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#e65100' }}><span>✓ चांदी दिली:</span><strong>₹{effectiveSilver.toFixed(2)}</strong></div>
                            <div style={{ fontSize: '10px', color: '#999', textAlign: 'right' }}>{silver.grossWeight}g × {silver.purity}% = {silver.fineWeight.toFixed(3)}g × ₹{silver.silverRate}/g</div>
                        </div>
                    )}
                    {paidAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderTop: '1px dashed #FFCCBC', paddingTop: '5px', marginTop: '4px', color: '#2e7d32' }}><span>एकूण दिले:</span><strong>₹{paidAmount.toFixed(2)}</strong></div>}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', borderTop: '2px solid #C62828', paddingTop: '9px', marginTop: '7px', fontWeight: '900', color: remainingBalance > 0 ? '#C62828' : '#2e7d32' }}>
                        <span>शिल्लक:</span><span>₹{remainingBalance.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* ── Footer ── */}
            <div style={{ textAlign: 'center', borderTop: '1px dashed #C62828', paddingTop: '10px', marginTop: '16px', fontSize: '12px', color: '#aaa', display: 'flex', justifyContent: 'space-between' }}>
                <span>🙏 धन्यवाद! पुन्हा भेट द्या.</span>
                <span>अलंकार ज्वेलर्स — हुपरी, कोल्हापूर</span>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════
//  MAIN BILLING PAGE
// ═══════════════════════════════════════════════════
const Billing = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [silverRatePerGram, setSilverRatePerGram] = useState(0);
    const [items, setItems] = useState<BillItem[]>([emptyItem()]);

    // Payment
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
    const [cashAmount, setCashAmount] = useState(0);
    const [upiAmount, setUpiAmount] = useState(0);
    const [bankAmount, setBankAmount] = useState(0);
    const [silver, setSilver] = useState<SilverPayment>(emptySilver());

    // Optional manual previous balance (auto-fills from customer, editable)
    const [manualPrevBalance, setManualPrevBalance] = useState<string>('');

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

    // ── Fetch silver rate ──
    useEffect(() => {
        api.get('/silver-rates')
            .then(r => setSilverRatePerGram(parseFloat(((r.data?.rate || 0) / 1000).toFixed(2))))
            .catch(() => { });
    }, []);

    // Auto-fill silver rate when switching to Silver/Mixed mode
    useEffect(() => {
        if ((paymentMode === 'Silver' || paymentMode === 'Mixed') && silverRatePerGram > 0 && !silver.silverRate) {
            setSilver(prev => {
                const next = { ...prev, silverRate: silverRatePerGram };
                next.fineWeight = parseFloat(((next.grossWeight * next.purity) / 100).toFixed(4));
                next.silverValue = parseFloat((next.fineWeight * next.silverRate).toFixed(2));
                return next;
            });
        }
    }, [paymentMode, silverRatePerGram]);

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
    };

    const handleAddNewCustomer = async () => {
        if (!newCustomer.name) return;
        setAddingCustomer(true);
        try {
            const res = await api.post('/customers', { ...newCustomer, currentBalance: 0 });
            selectCustomer(res.data.customer || { ...res.data, currentBalance: 0 });
            setNewCustomer({ name: '', mobile: '', address: '' });
            setShowAddCustomer(false);
        } catch (e: any) { alert(e.response?.data?.message || 'ग्राहक जोडताना त्रुटी झाली.'); }
        setAddingCustomer(false);
    };

    // ── Calculations ──
    const subtotal = items.reduce((s, i) => s + (i.amount || 0), 0);
    const totalMakingCharges = items.reduce((s, i) => s + (i.makingCharge * i.weight || 0), 0);
    // previousBalance: use manual override if set, otherwise 0 (not auto-pulled so bill stays clean)
    const previousBalance = parseFloat(manualPrevBalance || '0') || 0;
    const totalPayable = subtotal + previousBalance;
    const effectiveCash = (paymentMode === 'Cash' || paymentMode === 'Mixed') ? cashAmount : 0;
    const effectiveUpi = (paymentMode === 'UPI' || paymentMode === 'Mixed') ? upiAmount : 0;
    const effectiveBank = (paymentMode === 'Bank' || paymentMode === 'Mixed') ? bankAmount : 0;
    const effectiveSilver = (paymentMode === 'Silver' || paymentMode === 'Mixed') ? silver.silverValue : 0;
    const paidAmount = parseFloat((effectiveCash + effectiveUpi + effectiveBank + effectiveSilver).toFixed(2));
    const remainingBalance = parseFloat((totalPayable - paidAmount).toFixed(2));

    // ── Item editing ──
    const updateItem = (i: number, field: keyof BillItem, value: number | string) => {
        setItems(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], [field]: value };
            const item = updated[i];
            if (field === 'weight' || field === 'touch') {
                item.fine = parseFloat(((Number(item.weight) * Number(item.touch)) / 100).toFixed(3));
            }
            if (['fine', 'rate', 'makingCharge', 'weight', 'touch', 'quantity'].includes(field as string)) {
                item.amount = parseFloat(((item.fine * item.rate) + (item.makingCharge * item.weight)).toFixed(2));
            }
            return updated;
        });
    };

    const resetForm = () => {
        setItems([emptyItem()]); setCashAmount(0); setUpiAmount(0); setBankAmount(0);
        setSilver(emptySilver()); setPaymentMode('Cash'); setSelectedCustomer(null);
        setCustomerSearch(''); setManualPrevBalance('');
    };

    // ── Save Bill ──
    const handleSave = async () => {
        if (!selectedCustomer) return alert('कृपया ग्राहक निवडा.');
        const validItems = items.filter(i => i.description && i.weight > 0);
        if (!validItems.length) return alert('कृपया किमान एक वस्तू जोडा.');
        if (paidAmount > totalPayable + 0.01) return alert('पेमेंट एकूण देण्यापेक्षा जास्त असू शकत नाही.');
        setSaving(true);
        try {
            const res = await api.post('/bills', {
                customerId: selectedCustomer._id,
                items: validItems, subtotal, totalMakingCharges, previousBalance, totalPayable,
                cashAmount: effectiveCash, upiAmount: effectiveUpi, bankAmount: effectiveBank,
                silverGrossWeight: effectiveSilver > 0 ? silver.grossWeight : 0,
                silverPurity: effectiveSilver > 0 ? silver.purity : 0,
                silverRate: effectiveSilver > 0 ? silver.silverRate : 0,
            });
            setSavedBill(res.data);
            alert(`बिल #${res.data.billNumber} यशस्वीरित्या जतन केले!`);
            resetForm();
        } catch (e: any) {
            alert(e.response?.data?.message || 'बिल जतन करताना त्रुटी झाली.');
        }
        setSaving(false);
    };

    // ── Capture printRef as image ──
    const captureBillCanvas = () => html2canvas(printRef.current!, { scale: 2.5, useCORS: true, backgroundColor: '#FFFDE7', logging: false });

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

    // ── WhatsApp Share — captures ONLY the clean bill ──
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
                        if (phone) window.open(`https://wa.me/91${phone}?text=नमस्कार,%20बिल+पाठवत+आहे+📄`, '_blank');
                        else window.open('https://web.whatsapp.com', '_blank');
                    }, 1200);
                }
            }, 'image/png');
        } catch (e) { console.error(e); }
        setSharing(false);
    };

    const MODES: PaymentMode[] = ['Cash', 'UPI', 'Bank', 'Silver', 'Mixed'];

    // ─────────────────────────────────────────────
    // Shared bill props
    // ─────────────────────────────────────────────
    const billProps = {
        customer: selectedCustomer, items, subtotal, previousBalance, totalPayable,
        cashPaid: effectiveCash, upiPaid: effectiveUpi, bankPaid: effectiveBank,
        silver, paymentMode, paidAmount, remainingBalance,
        billNumber: savedBill?.billNumber, billDate: savedBill?.date,
    };

    return (
        <div className="space-y-4 md:space-y-6">

            {/* ══════════════════════════════════════
                TOP ACTION BAR
            ══════════════════════════════════════ */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">नवीन बिल</h1>
                    <p className="text-muted-foreground text-sm">New Bill Entry</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={handleShareWhatsApp} disabled={sharing}
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md transition-colors text-sm font-medium">
                        <Share2 className="h-4 w-4" />
                        {sharing ? 'तयार होत आहे...' : 'WhatsApp'}
                    </button>
                    <button onClick={handleDownloadImage} disabled={downloading}
                        className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-3 py-2 rounded-md transition-colors text-sm font-medium">
                        <Download className="h-4 w-4" />
                        {downloading ? 'डाउनलोड...' : 'बिल डाउनलोड'}
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm font-medium">
                        <Save className="h-4 w-4" />
                        {saving ? 'जतन होत आहे...' : 'जतन करा'}
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════
                ENTRY FORM (never captured/printed)
            ══════════════════════════════════════ */}
            <div className="bg-white rounded-lg border border-border shadow-sm p-4 md:p-6 space-y-5">

                {/* Customer Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700">ग्राहकाचे / सोनाराचे नाव *</label>
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
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-gray-700">
                                मागील रक्कम देणे (₹)
                                <span className="text-xs font-normal text-muted-foreground ml-1">— भरल्यास बिलात दिसेल</span>
                            </label>
                            <input
                                type="number" min={0}
                                value={manualPrevBalance}
                                onChange={e => setManualPrevBalance(e.target.value)}
                                placeholder="0 (रिकामे ठेवल्यास दिसणार नाही)"
                                className="w-full border-2 border-orange-300 focus:border-orange-500 rounded-md px-3 py-2 text-sm focus:outline-none" />
                            {selectedCustomer && selectedCustomer.currentBalance > 0 && !manualPrevBalance && (
                                <button onClick={() => setManualPrevBalance(String(selectedCustomer.currentBalance))}
                                    className="text-xs text-orange-600 mt-1 underline hover:no-underline">
                                    DB मधील थकबाकी वापरा: ₹{selectedCustomer.currentBalance.toLocaleString('en-IN')}
                                </button>
                            )}
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

                                {/* दर + मजुरी */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">दर (₹/g)</label>
                                        <input type="number" value={item.rate || ''} onChange={e => updateItem(i, 'rate', parseFloat(e.target.value) || 0)}
                                            className="w-full border-2 border-gray-200 focus:border-primary rounded-md px-3 py-2 text-sm focus:outline-none text-right" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">मजुरी (₹/g)</label>
                                        <input type="number" value={item.makingCharge || ''} onChange={e => updateItem(i, 'makingCharge', parseFloat(e.target.value) || 0)}
                                            className="w-full border-2 border-gray-200 focus:border-primary rounded-md px-3 py-2 text-sm focus:outline-none text-right" />
                                    </div>
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
                                    {['तपशील', 'नग', 'वजन', 'टंच%', 'फाइन', 'दर₹', 'मजुरी₹', 'रक्कम₹', ''].map(h => (
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
                                        {(['quantity', 'weight', 'touch', 'fine', 'rate', 'makingCharge', 'amount'] as (keyof BillItem)[]).map(field => (
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
                        {(paymentMode === 'Silver' || paymentMode === 'Mixed') && (
                            <SilverPaymentFields silver={silver} onChange={setSilver} currentRate={silverRatePerGram} />
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

                {/* ══════════════════════════════════════
                CLEAN BILL PREVIEW — always 920px wide
                horizontal scroll on mobile
            ══════════════════════════════════════ */}
                <div>
                    <p className="text-xs text-muted-foreground mb-2 text-center">↓ बिल पूर्वावलोकन — WhatsApp साठी हेच पाठवले जाईल</p>
                    {/* Scroll wrapper on mobile so user can see the full bill */}
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <div ref={printRef} style={{ display: 'inline-block' }}>
                            <PrintableBill {...billProps} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Billing;
