import React from 'react';
import GlassCard from '../common/GlassCard';
import { COLORS } from '../../constants';
import { CheckCircle, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

const AdminDashboardOverview = ({ accountRequests, creditCardRequests, depositRequests, withdrawalRequests, loanRequests }) => {
    const totalPendingRequests =
        accountRequests.length +
        creditCardRequests.length +
        depositRequests.length +
        withdrawalRequests.length +
        loanRequests.length;

    return (
        <div className="p-8 w-full">
            <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Dashboard Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <GlassCard className="p-6 text-center">
                    <CheckCircle size={40} className="mx-auto mb-4" style={{ color: COLORS.primaryAccent }} />
                    <p className="text-xl font-semibold" style={{ color: COLORS.typography }}>Accounts Opened</p>
                    <p className="text-4xl font-bold mt-2" style={{ color: COLORS.primaryAccent }}>{/* Placeholder for actual count */ 'N/A'}</p>
                </GlassCard>
                <GlassCard className="p-6 text-center">
                    <Clock size={40} className="mx-auto mb-4" style={{ color: COLORS.warning }} />
                    <p className="text-xl font-semibold" style={{ color: COLORS.typography }}>Pending Requests</p>
                    <p className="text-4xl font-bold mt-2" style={{ color: COLORS.warning }}>{totalPendingRequests}</p>
                </GlassCard>
                <GlassCard className="p-6 text-center">
                    <AlertTriangle size={40} className="mx-auto mb-4" style={{ color: COLORS.danger }} />
                    <p className="text-xl font-semibold" style={{ color: COLORS.typography }}>Alerts / Suspicious Activity</p>
                    <p className="text-4xl font-bold mt-2" style={{ color: COLORS.danger }}>{/* Placeholder for actual count */ 'N/A'}</p>
                </GlassCard>
                <GlassCard className="p-6 text-center">
                    <TrendingUp size={40} className="mx-auto mb-4" style={{ color: COLORS.success }} />
                    <p className="text-xl font-semibold" style={{ color: COLORS.typography }}>Key Stats & System Health</p>
                    <p className="text-4xl font-bold mt-2" style={{ color: COLORS.success }}>{/* Placeholder for actual status */ 'Good'}</p>
                </GlassCard>
            </div>
            <p className="text-sm text-gray-400 italic mt-8">This section provides a high-level overview of the system's current state.</p>
        </div>
    );
};

export default AdminDashboardOverview;
