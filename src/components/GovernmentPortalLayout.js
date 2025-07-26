import React from 'react';
import GlassCard from './common/GlassCard';
import { COLORS } from '../constants';

const GovernmentPortalLayout = () => {
    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-4xl font-extrabold mb-8 text-center drop-shadow-sm" style={{ color: COLORS.primaryAccent }}>⚖️ Government Portal</h2>

            {/* Treasury Statement Section */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Treasury Statement</h3>
                <GlassCard className="p-8">
                    <p className="text-lg mb-4" style={{ color: COLORS.typography }}>Current Government Treasury Balance: <span className="font-bold text-2xl" style={{ color: COLORS.primaryAccent }}>5,000,000.00 RUB</span></p>
                    <p className="text-gray-400 italic">This represents the state's financial reserves and funds allocated for public services and economic stimulus within the digital economy.</p>
                </GlassCard>
            </section>

            {/* Legal Compliance Center Section */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Legal Compliance Center</h3>
                <GlassCard className="p-8">
                    <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>View Federal Laws & Audits</h4>
                    <ul className="space-y-3 text-gray-400">
                        <li><a href="#" className="hover:underline" style={{ color: COLORS.primaryAccent }}>View Federal Law 0135-FZ: Digital Banking Regulations</a></li>
                        <li><a href="#" className="hover:underline" style={{ color: COLORS.primaryAccent }}>View Ministry of Finance Audit Report - Q3 2023</a></li>
                        <li><a href="#" className="hover:underline" style={{ color: COLORS.primaryAccent }}>Sberbank Terms of Service</a></li>
                    </ul>
                    <p className="mt-6 text-sm text-gray-500 italic">
                        <span className="font-bold" style={{ color: COLORS.primaryAccent }}>Audit Status:</span> 📂 Last audited by Ministry of Finance on July 22, 2025. All systems compliant.
                    </p>
                </GlassCard>
            </section>
        </div>
    );
};

export default GovernmentPortalLayout;
