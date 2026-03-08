import { useState, useEffect } from 'react';
import api from '../api';
import { TrendingUp, Users, AlertCircle, RefreshCw } from 'lucide-react';

const Reports = () => {
    const [daily, setDaily] = useState<any>(null);
    const [outstanding, setOutstanding] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const [d, o] = await Promise.all([
                api.get('/reports/daily'),
                api.get('/reports/outstanding'),
            ]);
            setDaily(d.data);
            setOutstanding(o.data);
        } catch { }
        setLoading(false);
    };

    useEffect(() => { fetchReports(); }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-3xl font-bold">अहवाल (Reports)</h1><p className="text-muted-foreground">Business Reports</p></div>
                <button onClick={fetchReports} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <RefreshCw className="h-4 w-4" /> रिफ्रेश
                </button>
            </div>

            {loading ? (
                <div className="p-12 text-center text-muted-foreground">लोड होत आहे...</div>
            ) : (
                <>
                    {/* Daily Summary */}
                    <div className="bg-white rounded-lg border border-border shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" /> आजचा अहवाल — {new Date().toLocaleDateString('mr-IN')}
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'एकूण विक्री', value: `₹${daily?.totalSales?.toLocaleString('en-IN') || 0}`, color: 'bg-green-50 border-green-200 text-green-700' },
                                { label: 'एकूण बिले', value: daily?.billsCount || 0, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                                { label: 'नवीन ग्राहक', value: daily?.newCustomers || 0, color: 'bg-orange-50 border-orange-200 text-orange-700' },
                            ].map(item => (
                                <div key={item.label} className={`rounded-lg border p-4 ${item.color}`}>
                                    <p className="text-xs font-medium opacity-70">{item.label}</p>
                                    <p className="text-2xl font-bold mt-1">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Outstanding Balances */}
                    <div className="bg-white rounded-lg border border-border shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h2 className="font-semibold flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-destructive" /> थकबाकी यादी (Outstanding Balances)
                            </h2>
                            <span className="text-sm font-bold text-destructive">
                                एकूण: ₹{outstanding?.totalOutstanding?.toLocaleString('en-IN') || 0}
                            </span>
                        </div>
                        {!outstanding?.customers?.length ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                <p>कोणतीही थकबाकी नाही 🎉</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-secondary/30">
                                        <th className="text-left px-4 py-3 font-semibold">ग्राहकाचे नाव</th>
                                        <th className="text-left px-4 py-3 font-semibold">मोबाइल</th>
                                        <th className="text-right px-4 py-3 font-semibold text-destructive">थकबाकी (₹)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {outstanding.customers.map((c: any, i: number) => (
                                        <tr key={c._id} className={`border-b border-border ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                                            <td className="px-4 py-3 font-medium">{c.name}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{c.mobile || '—'}</td>
                                            <td className="px-4 py-3 text-right font-bold text-destructive">₹{c.currentBalance.toLocaleString('en-IN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
export default Reports;
