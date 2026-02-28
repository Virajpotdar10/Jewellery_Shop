import { useState, useEffect } from 'react';
import api from '../api';
import { Plus, Search, User, Phone, MapPin, X } from 'lucide-react';

interface Customer {
    _id: string;
    name: string;
    mobile: string;
    address: string;
    currentBalance: number;
    createdAt: string;
}

const Customers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({ name: '', mobile: '', address: '', currentBalance: '' });
    const [saving, setSaving] = useState(false);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/customers${search ? `?keyword=${search}` : ''}`);
            setCustomers(res.data);
        } catch (e) { }
        setLoading(false);
    };

    useEffect(() => { fetchCustomers(); }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchCustomers();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name) return;
        setSaving(true);
        try {
            await api.post('/customers', {
                name: form.name,
                mobile: form.mobile,
                address: form.address,
                currentBalance: Number(form.currentBalance) || 0,
            });
            setForm({ name: '', mobile: '', address: '', currentBalance: '' });
            setShowForm(false);
            fetchCustomers();
        } catch (e: any) {
            alert(e.response?.data?.message || 'ग्राहक जोडताना त्रुटी झाली.');
        }
        setSaving(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">ग्राहक व्यवस्थापन</h1>
                    <p className="text-muted-foreground mt-1">Customer Management</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors font-medium"
                >
                    <Plus className="h-5 w-5" />
                    नवीन ग्राहक जोडा
                </button>
            </div>

            {/* Add Customer Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h2 className="text-xl font-bold text-foreground">नवीन ग्राहक जोडा</h2>
                            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">ग्राहकाचे नाव *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="पूर्ण नाव टाका"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">मोबाइल नंबर</label>
                                <input
                                    type="tel"
                                    value={form.mobile}
                                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                                    className="w-full border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="मोबाइल नंबर"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">पत्ता</label>
                                <textarea
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                    className="w-full border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    rows={2}
                                    placeholder="पूर्ण पत्ता"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">उघडणारी शिल्लक (Opening Balance ₹)</label>
                                <input
                                    type="number"
                                    value={form.currentBalance}
                                    onChange={(e) => setForm({ ...form, currentBalance: e.target.value })}
                                    className="w-full border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="0"
                                    min="0"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 border border-border text-foreground py-2 rounded-md hover:bg-secondary transition-colors"
                                >
                                    रद्द करा
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition-colors font-medium"
                                >
                                    {saving ? 'जतन होत आहे...' : 'जतन करा'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="नाव किंवा मोबाइल नंबरने शोधा..."
                    />
                </div>
                <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
                    शोधा
                </button>
                {search && (
                    <button type="button" onClick={() => { setSearch(''); fetchCustomers(); }} className="border border-border px-4 py-2 rounded-md hover:bg-secondary transition-colors">
                        साफ करा
                    </button>
                )}
            </form>

            {/* Customers Table */}
            <div className="bg-white rounded-lg border border-border shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-muted-foreground">लोड होत आहे...</div>
                ) : customers.length === 0 ? (
                    <div className="p-12 text-center">
                        <User className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">कोणताही ग्राहक सापडला नाही.</p>
                        <button onClick={() => setShowForm(true)} className="mt-4 text-primary hover:underline text-sm">
                            + नवीन ग्राहक जोडा
                        </button>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-secondary/50">
                                <th className="text-left px-4 py-3 font-semibold text-foreground">ग्राहकाचे नाव</th>
                                <th className="text-left px-4 py-3 font-semibold text-foreground">मोबाइल</th>
                                <th className="text-left px-4 py-3 font-semibold text-foreground hidden md:table-cell">पत्ता</th>
                                <th className="text-right px-4 py-3 font-semibold text-foreground">शिल्लक (₹)</th>
                                <th className="text-center px-4 py-3 font-semibold text-foreground">क्रिया</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((c, i) => (
                                <tr key={c._id} className={`border-b border-border hover:bg-secondary/30 transition-colors ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                                                {c.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-foreground">{c.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                            <Phone className="h-3.5 w-3.5" />
                                            {c.mobile || '—'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                                        <div className="flex items-center gap-1">
                                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                            <span className="truncate max-w-[200px]">{c.address || '—'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`font-semibold ${c.currentBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                            ₹{c.currentBalance.toLocaleString('en-IN')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <a
                                            href={`/ledger?customerId=${c._id}&customerName=${c.name}`}
                                            className="text-primary hover:underline text-xs font-medium"
                                        >
                                            खाते पहा
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Customers;
