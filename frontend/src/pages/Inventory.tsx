import { useState, useEffect } from 'react';
import api from '../api';
import { Package, Plus } from 'lucide-react';

const Inventory = () => {
    const [stock, setStock] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ itemName: 'Silver Fine', weightIn: '' });
    const [saving, setSaving] = useState(false);

    const fetchStock = async () => {
        setLoading(true);
        try { const res = await api.get('/inventory'); setStock(res.data); } catch { }
        setLoading(false);
    };

    useEffect(() => { fetchStock(); }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.weightIn) return;
        setSaving(true);
        try {
            await api.post('/inventory', { itemName: form.itemName, weightIn: Number(form.weightIn) });
            setForm({ itemName: 'Silver Fine', weightIn: '' });
            setShowForm(false);
            fetchStock();
        } catch (e: any) { alert(e.response?.data?.message || 'त्रुटी झाली.'); }
        setSaving(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-3xl font-bold">स्टॉक (Inventory)</h1><p className="text-muted-foreground">Silver Stock Management</p></div>
                <button onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 text-sm font-medium">
                    <Plus className="h-4 w-4" /> स्टॉक जोडा
                </button>
            </div>

            {showForm && (
                <div className="bg-white rounded-lg border border-border shadow-sm p-6">
                    <h2 className="font-semibold mb-4">नवीन स्टॉक नोंद</h2>
                    <form onSubmit={handleAdd} className="flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium mb-1">वस्तूचे नाव</label>
                            <input value={form.itemName} onChange={e => setForm({ ...form, itemName: e.target.value })}
                                className="border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">आवक वजन (gram)</label>
                            <input type="number" required value={form.weightIn} onChange={e => setForm({ ...form, weightIn: e.target.value })}
                                className="border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="वजन ग्राम मध्ये" />
                        </div>
                        <button type="submit" disabled={saving}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 font-medium">
                            {saving ? 'जतन होत आहे...' : 'जतन करा'}
                        </button>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-lg border border-border shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-muted-foreground">लोड होत आहे...</div>
                ) : stock.length === 0 ? (
                    <div className="p-12 text-center">
                        <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-muted-foreground">कोणताही स्टॉक नोंदवलेला नाही.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-secondary/50">
                                <th className="text-left px-4 py-3 font-semibold">वस्तू</th>
                                <th className="text-right px-4 py-3 font-semibold text-green-600">एकूण आवक (gm)</th>
                                <th className="text-right px-4 py-3 font-semibold text-destructive">एकूण जावक (gm)</th>
                                <th className="text-right px-4 py-3 font-semibold">सध्याचा स्टॉक (gm)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stock.map((s, i) => (
                                <tr key={i} className={`border-b border-border ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                                    <td className="px-4 py-3 font-medium">{s._id}</td>
                                    <td className="px-4 py-3 text-right text-green-600">{s.totalIn?.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right text-destructive">{s.totalOut?.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right font-bold">
                                        <span className={s.currentStock < 100 ? 'text-orange-500' : 'text-foreground'}>{s.currentStock?.toFixed(2)}</span>
                                        {s.currentStock < 100 && <span className="ml-2 text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">कमी स्टॉक</span>}
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
export default Inventory;
