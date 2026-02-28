import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Home, FileText, BookOpen, Diamond, LogOut, Package, Users, Menu, X } from 'lucide-react';

const Layout = () => {
    const { user, logout } = useAuthStore();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    const navItems = [
        { name: 'डॅशबोर्ड', path: '/', icon: Home },
        { name: 'नवीन बिल', path: '/billing', icon: FileText },
        { name: 'ग्राहक', path: '/customers', icon: Users },
        { name: 'खातेवही (Ledger)', path: '/ledger', icon: BookOpen },
        { name: 'स्टॉक (Inventory)', path: '/inventory', icon: Package },
        { name: 'अहवाल (Reports)', path: '/reports', icon: Diamond },
    ];

    const NavLink = ({ item }: { item: typeof navItems[0] }) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
            <Link
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground/70 hover:bg-secondary hover:text-foreground'
                    }`}
            >
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span>{item.name}</span>
            </Link>
        );
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            <div className="p-5 border-b border-border flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-primary leading-tight">Jewellery Shop</h1>
                    <p className="text-xs text-muted-foreground">Management System</p>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="md:hidden text-muted-foreground hover:text-foreground p-1">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                {navItems.map(item => <NavLink key={item.path} item={item} />)}
            </nav>

            <div className="p-3 border-t border-border">
                <div className="flex items-center gap-3 px-3 py-2 mb-1">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate">{user?.username}</span>
                        <span className="text-xs text-muted-foreground">{user?.role}</span>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors text-sm"
                >
                    <LogOut className="h-4 w-4" />
                    लॉगआउट
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-secondary overflow-hidden">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar — always visible on md+, slide-in drawer on mobile */}
            <aside className={`
                fixed top-0 left-0 h-full w-64 bg-white border-r border-border shadow-lg z-40
                transform transition-transform duration-300 ease-in-out
                md:relative md:translate-x-0 md:shadow-sm md:z-auto
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <SidebarContent />
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile top bar */}
                <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-border shadow-sm flex-shrink-0">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="text-foreground p-1 hover:bg-secondary rounded-md"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <h1 className="text-base font-bold text-primary">Jewellery Shop</h1>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
