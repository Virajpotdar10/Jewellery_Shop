import { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import api from '../api';
import { Plus, Trash2, Printer, Save, Search, Share2, X } from 'lucide-react';

interface Customer { _id: string; name: string; mobile: string; currentBalance: number; }
interface BillItem {
    description: string; quantity: number; weight: number;
    touch: number; fine: number; rate: number; makingCharge: number; amount: number;
}

const emptyItem = (): BillItem => ({
    description: '', quantity: 1, weight: 0, touch: 0, fine: 0, rate: 0, makingCharge: 0, amount: 0,
});

const Billing = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [silverRate, setSilverRate] = useState(0);
    const [items, setItems] = useState<BillItem[]>([emptyItem()]);
    const [paidAmount, setPaidAmount] = useState(0);
    const [saving, setSaving] = useState(false);
    const [savedBill, setSavedBill] = useState<any>(null);
    const [sharing, setSharing] = useState(false);
    // Inline add-customer form
    const [showAddCustomer, setShowAddCustomer] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', mobile: '', address: '' });
    const [addingCustomer, setAddingCustomer] = useState(false);

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({ contentRef: printRef });

    useEffect(() => {
        api.get('/silver-rates').then(r => setSilverRate(r.data?.rate || 0)).catch(() => { });
    }, []);

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
    };

    const handleAddNewCustomer = async () => {
        if (!newCustomer.name) return;
        setAddingCustomer(true);
        try {
            const res = await api.post('/customers', {
                name: newCustomer.name,
                mobile: newCustomer.mobile,
                address: newCustomer.address,
                currentBalance: 0,
            });
            selectCustomer(res.data.customer || { ...res.data, currentBalance: 0 });
            setNewCustomer({ name: '', mobile: '', address: '' });
            setShowAddCustomer(false);
        } catch (e: any) {
            alert(e.response?.data?.message || 'ग्राहक जोडताना त्रुटी झाली.');
        }
        setAddingCustomer(false);
    };

    const handleShareWhatsApp = async () => {
        if (!printRef.current) return;
        setSharing(true);
        try {
            const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            canvas.toBlob(async (blob) => {
                if (!blob) { setSharing(false); return; }
                const file = new File([blob], `bill-${savedBill?.billNumber || 'draft'}.png`, { type: 'image/png' });
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: `बिल - ${selectedCustomer?.name || ''}`, text: `श्री यश ज्वेलर्स - बिल` });
                } else {
                    // Fallback: download image then open WhatsApp
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `bill-${savedBill?.billNumber || 'draft'}.png`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setTimeout(() => {
                        const phone = selectedCustomer?.mobile?.replace(/\D/g, '');
                        if (phone) window.open(`https://wa.me/91${phone}?text=बिल+पाठवत+आहे+📄`, '_blank');
                    }, 1000);
                }
            }, 'image/png');
        } catch (e) { console.error(e); }
        setSharing(false);
    };

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

    const subtotal = items.reduce((s, i) => s + (i.amount || 0), 0);
    const totalMakingCharges = items.reduce((s, i) => s + (i.makingCharge * i.weight || 0), 0);
    const previousBalance = selectedCustomer?.currentBalance || 0;
    const totalPayable = subtotal + previousBalance;
    const remainingBalance = totalPayable - paidAmount;

    const handleSave = async () => {
        if (!selectedCustomer) return alert('कृपया ग्राहक निवडा.');
        const validItems = items.filter(i => i.description && i.weight > 0);
        if (!validItems.length) return alert('कृपया किमान एक वस्तू जोडा.');
        setSaving(true);
        try {
            const res = await api.post('/bills', {
                customerId: selectedCustomer._id,
                items: validItems,
                subtotal, totalMakingCharges, previousBalance, totalPayable,
                paidAmount, remainingBalance,
            });
            setSavedBill(res.data);
            alert(`बिल #${res.data.billNumber} यशस्वीरित्या जतन केले!`);
            setItems([emptyItem()]);
            setPaidAmount(0);
            setSelectedCustomer(null);
            setCustomerSearch('');
        } catch (e: any) {
            alert(e.response?.data?.message || 'बिल जतन करताना त्रुटी झाली.');
        }
        setSaving(false);
    };

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">नवीन बिल</h1>
                    <p className="text-muted-foreground text-sm">New Bill</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {/* WhatsApp Share */}
                    <button
                        onClick={handleShareWhatsApp}
                        disabled={sharing}
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md transition-colors text-sm font-medium"
                        title="WhatsApp वर बिल पाठवा"
                    >
                        <Share2 className="h-4 w-4" />
                        {sharing ? 'तयार होत आहे...' : 'WhatsApp'}
                    </button>
                    <button
                        onClick={() => handlePrint()}
                        className="flex items-center gap-2 border border-border px-3 py-2 rounded-md hover:bg-secondary transition-colors text-sm"
                    >
                        <Printer className="h-4 w-4" /> प्रिंट
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                        <Save className="h-4 w-4" />
                        {saving ? 'जतन होत आहे...' : 'जतन करा'}
                    </button>
                </div>
            </div>

            {/* Bill content (print area) */}
            <div className="bg-white rounded-lg border border-border shadow-sm p-4 md:p-6 space-y-5" ref={printRef}>
                {/* Header */}
                <div className="text-center border-b-2 border-primary pb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-primary">श्रीयश ज्वेलर्स</h2>
                    <p className="text-muted-foreground text-sm">हुपरी, कोल्हापूर</p>
                    <p className="text-sm text-muted-foreground">दिनांक: {new Date().toLocaleDateString('mr-IN')}</p>
                </div>

                {/* Customer / Goldsmith Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">ग्राहकाचे / सोनाराचे नाव *</label>
                        <div className="relative">
                            <div className="flex items-center border border-border rounded-md focus-within:ring-2 focus-within:ring-primary/50">
                                <Search className="h-4 w-4 text-muted-foreground ml-3 flex-shrink-0" />
                                <input
                                    type="text"
                                    value={customerSearch}
                                    onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null); setShowAddCustomer(false); }}
                                    onFocus={() => { if (customers.length > 0) setShowDropdown(true); }}
                                    className="flex-1 px-3 py-2 focus:outline-none rounded-r-md text-sm"
                                    placeholder="नाव शोधा किंवा टाका..."
                                />
                                {customerSearch && (
                                    <button onClick={() => { setCustomerSearch(''); setSelectedCustomer(null); setShowDropdown(false); setShowAddCustomer(false); }} className="mr-2">
                                        <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                    </button>
                                )}
                            </div>

                            {/* Dropdown */}
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
                                    {/* Add new option always at bottom */}
                                    <div
                                        onClick={() => { setShowDropdown(false); setShowAddCustomer(true); setNewCustomer(n => ({ ...n, name: customerSearch })); }}
                                        className="px-4 py-2.5 hover:bg-primary/10 cursor-pointer flex items-center gap-2 text-primary border-t border-border/60 font-medium text-sm"
                                    >
                                        <Plus className="h-4 w-4" />
                                        नवीन ग्राहक जोडा: &quot;{customerSearch}&quot;
                                    </div>
                                </div>
                            )}

                            {/* No results + add option */}
                            {customerSearch && customers.length === 0 && !showDropdown && !selectedCustomer && (
                                <div className="absolute z-20 top-full mt-1 w-full bg-white border border-border rounded-md shadow-xl">
                                    <div
                                        onClick={() => { setShowAddCustomer(true); setNewCustomer(n => ({ ...n, name: customerSearch })); }}
                                        className="px-4 py-3 hover:bg-primary/10 cursor-pointer flex items-center gap-2 text-primary font-medium text-sm"
                                    >
                                        <Plus className="h-4 w-4" />
                                        नवीन जोडा: &quot;{customerSearch}&quot;
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Inline Add Customer Form */}
                        {showAddCustomer && (
                            <div className="mt-2 border border-primary/30 bg-primary/5 rounded-md p-3 space-y-2">
                                <p className="text-sm font-semibold text-primary">नवीन ग्राहक / सोनार नोंदणी</p>
                                <input value={newCustomer.name} onChange={e => setNewCustomer(n => ({ ...n, name: e.target.value }))}
                                    className="w-full border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="पूर्ण नाव *" />
                                <input value={newCustomer.mobile} onChange={e => setNewCustomer(n => ({ ...n, mobile: e.target.value }))}
                                    className="w-full border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="मोबाइल नंबर" type="tel" />
                                <input value={newCustomer.address} onChange={e => setNewCustomer(n => ({ ...n, address: e.target.value }))}
                                    className="w-full border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="पत्ता (वैकल्पिक)" />
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

                    <div>
                        <label className="block text-sm font-medium mb-1">मोबाइल नंबर</label>
                        <input value={selectedCustomer?.mobile || ''} readOnly
                            className="w-full border border-border rounded-md px-3 py-2 bg-secondary/30 text-muted-foreground text-sm" />
                        {selectedCustomer && selectedCustomer.currentBalance > 0 && (
                            <p className="text-xs text-destructive mt-1">मागील थकबाकी: ₹{selectedCustomer.currentBalance.toLocaleString('en-IN')}</p>
                        )}
                    </div>
                </div>

                {/* Silver Rate */}
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-md border border-primary/20 flex-wrap">
                    <span className="text-sm font-medium text-primary">चांदी दर:</span>
                    <input type="number" value={silverRate} onChange={e => setSilverRate(Number(e.target.value))}
                        className="border border-border rounded px-2 py-1.5 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-primary" />
                    <span className="text-sm text-muted-foreground">₹/किलो</span>
                </div>

                {/* Items Table — scrollable on mobile */}
                <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
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
                                            className="w-full px-2 py-1 focus:outline-none min-w-[100px] text-xs md:text-sm" placeholder="नाव" />
                                    </td>
                                    {(['quantity', 'weight', 'touch', 'fine', 'rate', 'makingCharge', 'amount'] as (keyof BillItem)[]).map(field => (
                                        <td key={field} className="border border-primary/30 p-1">
                                            <input
                                                type="number"
                                                value={(item[field] as number) || ''}
                                                onChange={e => updateItem(i, field, parseFloat(e.target.value) || 0)}
                                                readOnly={field === 'fine' || field === 'amount'}
                                                className={`w-full px-1 py-1 text-right focus:outline-none min-w-[60px] text-xs md:text-sm ${field === 'fine' || field === 'amount' ? 'bg-secondary/40 text-muted-foreground' : ''}`}
                                            />
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

                {/* Totals */}
                <div className="ml-auto max-w-sm space-y-2 border-2 border-primary rounded-lg p-4">
                    <div className="flex justify-between text-sm"><span>एकूण रक्कम:</span><span className="font-medium">₹{subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span>मागील थकबाकी:</span><span className="font-medium text-destructive">₹{previousBalance.toFixed(2)}</span></div>
                    <div className="flex justify-between font-semibold text-base border-t border-primary/30 pt-2">
                        <span>एकूण देणे:</span><span className="text-primary">₹{totalPayable.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm gap-2">
                        <span className="whitespace-nowrap">आज दिलेली रक्कम:</span>
                        <input type="number" value={paidAmount || ''}
                            onChange={e => setPaidAmount(Number(e.target.value))}
                            className="border border-border rounded px-2 py-1 w-28 text-right focus:outline-none focus:ring-1 focus:ring-primary text-sm" />
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t-2 border-primary pt-2">
                        <span>शिल्लक:</span>
                        <span className={remainingBalance > 0 ? 'text-destructive' : 'text-green-600'}>₹{remainingBalance.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Billing;
