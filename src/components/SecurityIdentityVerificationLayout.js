import React from 'react';
import GlassCard from './common/GlassCard';
import { COLORS } from '../constants';

const SecurityIdentityVerificationLayout = () => {
    // Simple alert for locking account
    const handleLockAccount = () => {
        alert('Your account has been locked. Please contact support to unlock.');
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-4xl font-extrabold mb-8 text-center drop-shadow-sm" style={{ color: COLORS.primaryAccent }}>🛡️ Security & Identity Verification</h2>

            {/* Account Locking/PIN System Section */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Account Locking / PIN System</h3>
                <GlassCard className="p-8">
                    <p className="mb-4" style={{ color: COLORS.typography }}>For additional security, you can lock your account.</p>
                    <button onClick={handleLockAccount} className="bg-red-700 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300">Lock My Account</button>
                </GlassCard>
            </section>

            {/* Fraud Alerts / Risk Flags Section - Removed hardcoded alert */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Fraud Alerts / Risk Flags</h3>
                <GlassCard className="p-8 text-center">
                    <p className="text-gray-400">Fraud alerts and risk flags will appear here based on your account activity.</p>
                    {/* Future implementation: Display dynamic alerts based on user's `fraudFlags` array in userProfile */}
                    {/* Example of how a dynamic alert might look: */}
                    {/*
                    <ul className="space-y-4 mt-4">
                        <li className="p-4 rounded-lg shadow-sm border border-red-500" style={{ backgroundColor: COLORS.tertiary }}>
                            <p className="text-red-500 font-semibold">Alert: Suspicious login attempt detected!</p>
                            <p className="text-sm text-gray-400">Timestamp: 2024-07-26 10:30 AM</p>
                        </li>
                    </ul>
                    */}
                </GlassCard>
            </section>
        </div>
    );
};

export default SecurityIdentityVerificationLayout;
