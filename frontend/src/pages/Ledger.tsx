import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { Search, ArrowUpCircle, ArrowDownCircle, CreditCard, Trash2, ChevronLeft } from 'lucide-react';

interface Customer { _id: string; name: string; mobile: string; currentBalance: number; }
interface LedgerEntry { _id: string; date: string; description: string; credit: number; debit: number; balance: number; }

const Ledger = () => {
    const [searchParams] = useSearchParams();
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [search, setSearch] = useState(searchParams.get('customerName') || '');
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(true);
    const [showPayment, setShowPayment] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');

    // Load all customers on mount
    useEffect(() => {
        setListLoading(true);
        api.get('/customers').then(r => setAllCustomers(r.data)).catch(() => { }).finally(() => setListLoading(false));

        const id = searchParams.get('customerId');
        if (id) {
            api.get(`/customers/${id}`).then(r => {
                setSelectedCustomer(r.data);
                loadLedger(id);
            }).catch(() => { });
        }
    }, []);

    const filteredCustomers = search
        ? allCustomers.filter(c =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.mobile && c.mobile.includes(search))
        )
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

    const handlePayment = async () => {
        if (!selectedCustomer || !paymentAmount) return;
        try {
            await api.post('/payments', {
                customerId: selectedCustomer._id,
                amount: Number(paymentAmount),
                method: paymentMethod,
            });
            setPaymentAmount('');
            setShowPayment(false);
            loadLedger(selectedCustomer._id);
            alert('पेमेंट यशस्वीरित्या नोंदवले!');
        } catch (e: any) {
            alert(e.response?.data?.message || 'पेमेंट नोंदवताना त्रुटी झाली.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-3xl font-bold">खातेवही (Ledger)</h1><p className="text-muted-foreground">Customer Account Book</p></div>
                {selectedCustomer && (
                    <button onClick={() => setShowPayment(true)}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium">
                        <CreditCard className="h-4 w-4" /> पेमेंट घ्या
                    </button>
                )}
            </div>

            {/* Payment Modal */}
            {showPayment && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <h2 className="text-xl font-bold">पेमेंट घ्या — {selectedCustomer?.name}</h2>
                        <div>
                            <label className="block text-sm font-medium mb-1">रक्कम (₹)</label>
                            <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                                className="w-full border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="रक्कम टाका" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">पेमेंट पद्धत</label>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                                className="w-full border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50">
                                {['Cash', 'UPI', 'Bank', 'Partial'].map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowPayment(false)} className="flex-1 border border-border py-2 rounded-md hover:bg-secondary">रद्द करा</button>
                            <button onClick={handlePayment} className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 font-medium">पेमेंट जतन करा</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Search bar */}
            <div className="flex items-center border border-border rounded-md bg-white shadow-sm">
                <Search className="h-4 w-4 text-muted-foreground ml-3 flex-shrink-0" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 px-3 py-2.5 focus:outline-none text-sm"
                    placeholder="नाव किंवा मोबाइल नंबरने शोधा..."
                />
                {search && (
                    <button onClick={() => setSearch('')} className="mr-3 text-muted-foreground hover:text-foreground text-xs">✕ साफ</button>
                )}
            </div>

            {/* Customer List (always visible, filters on search) */}
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
                                <div key={c._id}
                                    className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors group">
                                    {/* Left — clickable area for selecting customer */}
                                    <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => selectCustomer(c)}>
                                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                                            {c.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{c.name}</p>
                                            <p className="text-xs text-muted-foreground">{c.mobile || '—'}</p>
                                        </div>
                                    </div>
                                    {/* Right — balance + delete */}
                                    <div className="flex items-center gap-3">
                                        <div className="text-right cursor-pointer" onClick={() => selectCustomer(c)}>
                                            <span className={`text-sm font-bold ${c.currentBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                                ₹{c.currentBalance.toLocaleString('en-IN')}
                                            </span>
                                            {c.currentBalance > 0 && <p className="text-xs text-muted-foreground">थकबाकी</p>}
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(c); }}
                                            className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 p-1.5 rounded transition-all"
                                            title="ग्राहक हटवा"
                                        >
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
                    <div>
                        <p className="text-sm text-muted-foreground">ग्राहकाचे नाव</p>
                        <p className="text-xl font-bold">{selectedCustomer.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedCustomer.mobile}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">एकूण थकबाकी</p>
                        <p className={`text-3xl font-bold ${selectedCustomer.currentBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                            ₹{selectedCustomer.currentBalance?.toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>
            )}

            {/* Ledger Entries */}
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
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-secondary/20">
                                    <th className="text-left px-4 py-3">दिनांक</th>
                                    <th className="text-left px-4 py-3">तपशील</th>
                                    <th className="text-right px-4 py-3 text-destructive">उधार (Debit)</th>
                                    <th className="text-right px-4 py-3 text-green-600">जमा (Credit)</th>
                                    <th className="text-right px-4 py-3">शिल्लक</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((e, i) => (
                                    <tr key={e._id} className={`border-b border-border ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                                        <td className="px-4 py-3 text-muted-foreground">{new Date(e.date).toLocaleDateString('mr-IN')}</td>
                                        <td className="px-4 py-3">{e.description}</td>
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
                                        <td className="px-4 py-3 text-right font-semibold">₹{e.balance.toLocaleString('en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}


        </div>
    );
};
export default Ledger;
