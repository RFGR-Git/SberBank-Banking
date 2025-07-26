import React from 'react';
import { COLORS } from '../../constants';
import { LayoutDashboard, Folder, CreditCard, User, Scale, BarChart, Landmark, Shield, Settings, LogOut } from 'lucide-react';

const AdminSidebar = ({ activeSection, setActiveSection, userProfile }) => {
    return (
        <div className="w-64 bg-gray-800 text-white flex flex-col h-full rounded-r-lg shadow-lg" style={{ backgroundColor: COLORS.secondaryBackground }}>
            <div className="p-6 text-center border-b border-gray-700" style={{ borderColor: COLORS.tertiary }}>
                <h1 className="text-2xl font-bold" style={{ color: COLORS.primaryAccent }}>SBERBANK ADMIN PANEL</h1>
            </div>
            <nav className="flex-grow p-4 space-y-2">
                <button
                    className={`flex items-center w-full p-3 rounded-lg text-left transition-colors duration-200 ${activeSection === 'dashboard-overview' ? 'bg-green-700 text-white' : 'hover:bg-gray-700'}`}
                    style={activeSection === 'dashboard-overview' ? { backgroundColor: COLORS.primaryAccent, color: COLORS.background } : {}}
                    onClick={() => setActiveSection('dashboard-overview')}
                >
                    <LayoutDashboard size={20} className="mr-3" /> Dashboard Overview
                </button>
                <button
                    className={`flex items-center w-full p-3 rounded-lg text-left transition-colors duration-200 ${activeSection === 'account-queues' ? 'bg-green-700 text-white' : 'hover:bg-gray-700'}`}
                    style={activeSection === 'account-queues' ? { backgroundColor: COLORS.primaryAccent, color: COLORS.background } : {}}
                    onClick={() => setActiveSection('account-queues')}
                >
                    <Folder size={20} className="mr-3" /> Account Queues
                </button>
                <button
                    className={`flex items-center w-full p-3 rounded-lg text-left transition-colors duration-200 ${activeSection === 'credit-loans' ? 'bg-green-700 text-white' : 'hover:bg-gray-700'}`}
                    style={activeSection === 'credit-loans' ? { backgroundColor: COLORS.primaryAccent, color: COLORS.background } : {}}
                    onClick={() => setActiveSection('credit-loans')}
                >
                    <CreditCard size={20} className="mr-3" /> Credit & Loans
                </button>
                <button
                    className={`flex items-center w-full p-3 rounded-lg text-left transition-colors duration-200 ${activeSection === 'user-management' ? 'bg-green-700 text-white' : 'hover:bg-gray-700'}`}
                    style={activeSection === 'user-management' ? { backgroundColor: COLORS.primaryAccent, color: COLORS.background } : {}}
                    onClick={() => setActiveSection('user-management')}
                >
                    <User size={20} className="mr-3" /> User Management
                </button>
                <button
                    className={`flex items-center w-full p-3 rounded-lg text-left transition-colors duration-200 ${activeSection === 'reports-audits' ? 'bg-green-700 text-white' : 'hover:bg-gray-700'}`}
                    style={activeSection === 'reports-audits' ? { backgroundColor: COLORS.primaryAccent, color: COLORS.background } : {}}
                    onClick={() => setActiveSection('reports-audits')}
                >
                    <BarChart size={20} className="mr-3" /> Reports & Audits
                </button>
                <button
                    className={`flex items-center w-full p-3 rounded-lg text-left transition-colors duration-200 ${activeSection === 'government-tools' ? 'bg-green-700 text-white' : 'hover:bg-gray-700'}`}
                    style={activeSection === 'government-tools' ? { backgroundColor: COLORS.primaryAccent, color: COLORS.background } : {}}
                    onClick={() => setActiveSection('government-tools')}
                >
                    <Landmark size={20} className="mr-3" /> Government Tools
                </button>
                <button
                    className={`flex items-center w-full p-3 rounded-lg text-left transition-colors duration-200 ${activeSection === 'security-tools' ? 'bg-green-700 text-white' : 'hover:bg-gray-700'}`}
                    style={activeSection === 'security-tools' ? { backgroundColor: COLORS.primaryAccent, color: COLORS.background } : {}}
                    onClick={() => setActiveSection('security-tools')}
                >
                    <Shield size={20} className="mr-3" /> Security Tools
                </button>
                {userProfile?.specialRole === 'Super Admin' && ( // Only visible to Super Admins
                    <button
                        className={`flex items-center w-full p-3 rounded-lg text-left transition-colors duration-200 ${activeSection === 'advanced-admin' ? 'bg-green-700 text-white' : 'hover:bg-gray-700'}`}
                        style={activeSection === 'advanced-admin' ? { backgroundColor: COLORS.primaryAccent, color: COLORS.background } : {}}
                        onClick={() => setActiveSection('advanced-admin')}
                    >
                        <Settings size={20} className="mr-3" /> Advanced Admin
                    </button>
                )}
            </nav>
            <div className="p-4 border-t border-gray-700" style={{ borderColor: COLORS.tertiary }}>
                <button
                    className="flex items-center w-full p-3 rounded-lg text-left text-red-400 hover:bg-red-900 transition-colors duration-200"
                    onClick={() => setActiveSection('sign-out')} // This will be handled in AdminDashboardLayout
                >
                    <LogOut size={20} className="mr-3" /> Sign Out
                </button>
            </div>
        </div>
    );
};

export default AdminSidebar;
