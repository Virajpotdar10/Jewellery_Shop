import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { TrendingUp, Users, AlertCircle, Package, Plus, BookOpen, RefreshCw } from 'lucide-react';

interface SilverRate {
    rate: number;
    source: string;
    updatedAt: string;
}

interface DailyReport {
    billsCount: number;
    totalSales: number;
    totalSilverWeightSold: number;
    newCustomers: number;
}

const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <div className="bg-white rounded-lg border border-border shadow-sm p-6 flex items-start gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
    </div>
);

const Dashboard = () => {
    const [silverRate, setSilverRate] = useState<SilverRate | null>(null);
    const [report, setReport] = useState<DailyReport | null>(null);
    const [manualRate, setManualRate] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [rateRes, reportRes] = await Promise.all([
                api.get('/silver-rates').catch(() => null),
                api.get('/reports/daily').catch(() => null),
            ]);
            if (rateRes) setSilverRate(rateRes.data);
            if (reportRes) setReport(reportRes.data);
        } catch (e) { }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const updateRate = async () => {
        if (!manualRate) return;
        try {
            const res = await api.post('/silver-rates', { rate: Number(manualRate) });
            setSilverRate(res.data);
            setManualRate('');
            alert('चांदी दर अपडेट केला!');
        } catch (e) {
            alert('दर अपडेट करताना त्रुटी झाली.');
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">डॅशबोर्ड</h1>
                    <p className="text-muted-foreground mt-1">
                        {new Date().toLocaleDateString('mr-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <button onClick={fetchData} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <RefreshCw className="h-4 w-4" /> रिफ्रेश करा
                </button>
            </div>

            {/* Silver Rate Card */}
            <div className="bg-gradient-to-r from-primary/90 to-primary rounded-xl p-6 text-white shadow-md">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <p className="text-white/80 text-sm font-medium">आजचा चांदी दर (Silver Rate)</p>
                        <p className="text-4xl font-bold mt-1">
                            ₹{silverRate ? silverRate.rate.toLocaleString('en-IN') : '---'}
                            <span className="text-lg font-normal text-white/70 ml-2">/ किलो</span>
                        </p>
                        {silverRate && (
                            <p className="text-white/60 text-xs mt-1">
                                स्रोत: {silverRate.source} · अपडेट: {new Date(silverRate.updatedAt).toLocaleTimeString('mr-IN')}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={manualRate}
                            onChange={(e) => setManualRate(e.target.value)}
                            placeholder="नवीन दर टाका"
                            className="bg-white/20 border border-white/30 text-white placeholder:text-white/50 rounded-md px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-white/60"
                        />
                        <button
                            onClick={updateRate}
                            className="bg-white text-primary font-semibold text-sm px-4 py-2 rounded-md hover:bg-white/90 transition-colors"
                        >
                            दर सेट करा
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="आजची एकूण विक्री"
                    value={report ? `₹${report.totalSales.toLocaleString('en-IN')}` : '₹0'}
                    icon={TrendingUp}
                    color="bg-green-500"
                    subtitle={`${report?.billsCount || 0} बिले`}
                />
                <StatCard
                    title="चांदी वजन विकले"
                    value={report ? `${report.totalSilverWeightSold.toFixed(2)} ग्राम` : '0 ग्राम'}
                    icon={Package}
                    color="bg-blue-500"
                />
                <StatCard
                    title="नवीन ग्राहक"
                    value={report?.newCustomers || 0}
                    icon={Users}
                    color="bg-purple-500"
                    subtitle="आज नोंदणी केलेले"
                />
                <StatCard
                    title="एकूण बिले"
                    value={report?.billsCount || 0}
                    icon={AlertCircle}
                    color="bg-orange-500"
                    subtitle="आज"
                />
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">जलद क्रिया (Quick Actions)</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Link
                        to="/billing"
                        className="flex items-center gap-4 bg-white rounded-lg border-2 border-primary/30 hover:border-primary p-5 transition-all shadow-sm hover:shadow-md group"
                    >
                        <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                            <Plus className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">नवीन बिल</p>
                            <p className="text-sm text-muted-foreground">नवीन बिल बनवा</p>
                        </div>
                    </Link>

                    <Link
                        to="/customers"
                        className="flex items-center gap-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 p-5 transition-all shadow-sm hover:shadow-md group"
                    >
                        <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                            <Users className="h-7 w-7 text-blue-500" />
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">ग्राहक व्यवस्थापन</p>
                            <p className="text-sm text-muted-foreground">ग्राहक पहा / नवीन जोडा</p>
                        </div>
                    </Link>

                    <Link
                        to="/ledger"
                        className="flex items-center gap-4 bg-white rounded-lg border-2 border-green-200 hover:border-green-400 p-5 transition-all shadow-sm hover:shadow-md group"
                    >
                        <div className="p-3 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                            <BookOpen className="h-7 w-7 text-green-500" />
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">खातेवही</p>
                            <p className="text-sm text-muted-foreground">ग्राहकाचे खाते पहा</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
