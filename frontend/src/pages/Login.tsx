import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../api';
import { LogIn, Diamond } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const setAuth = useAuthStore((state) => state.setAuth);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await api.post('/auth/login', { username, password });
            setAuth(res.data.token, {
                _id: res.data._id,
                username: res.data.username,
                role: res.data.role,
            });
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'चुकीचे नाव किंवा पासवर्ड.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-white to-primary/10 px-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-border w-full max-w-md overflow-hidden">
                {/* Top banner */}
                <div className="bg-primary px-8 py-7 text-center">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-white/20 mb-3">
                        <Diamond className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">श्रीयश ज्वेलर्स</h1>
                    <p className="text-white/70 text-sm mt-1">Management System</p>
                </div>

                {/* Form */}
                <div className="px-8 py-7">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm border border-destructive/20 text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-foreground">
                                वापरकर्ता नाव / Email
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoComplete="username"
                                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                placeholder="virajpotdar4@gmail.com"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-foreground">
                                पासवर्ड
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                placeholder="••••••••"
                            />
                        </div>

                        {/* Remember Me */}
                        <label className="flex items-center gap-3 cursor-pointer select-none group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                                    ${rememberMe ? 'bg-primary border-primary' : 'bg-white border-border group-hover:border-primary/50'}`}>
                                    {rememberMe && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-foreground">लक्षात ठेवा</span>
                                <p className="text-xs text-muted-foreground">मला पुन्हा लॉगिन करावे लागणार नाही</p>
                            </div>
                        </label>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm mt-2"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    लॉगिन होत आहे...
                                </span>
                            ) : (
                                <>
                                    <LogIn className="w-4 h-4" />
                                    लॉगिन करा
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
