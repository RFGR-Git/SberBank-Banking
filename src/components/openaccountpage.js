import React from 'react';
import GlassCard from './common/GlassCard';
import { COLORS } from '../constants';
import { UserRoundCog, PiggyBank, Briefcase, Landmark, CreditCard, TrendingUp, UserRoundSearch } from 'lucide-react';

const OpenAccountPage = ({ userProfile, setCurrentView }) => {
    const accountTypes = [
        { key: 'Personal', name: 'Personal Account (Standard)', icon: <UserRoundCog size={40} color={COLORS.primaryAccent} />, description: 'The basic, default account for any citizen. Holds wages, transfers, and currency.', appliesTo: 'All verified users', infoRequired: 'Name, KYC ID', approval: 'Auto-approved', page: 'open-personal' },
        { key: 'Savings', name: 'Savings Account', icon: <PiggyBank size={40} color={COLORS.primaryAccent} />, description: 'Designed for long-term saving, interest accumulation, and stability.', appliesTo: 'Users w/ Personal Account', infoRequired: 'Link to personal account, account label', approval: 'Auto-approved', page: 'open-savings' },
        { key: 'Business', name: 'Business Account', icon: <Briefcase size={40} color={COLORS.primaryAccent} />, description: 'For business owners or legal entities. Separate from personal account.', appliesTo: 'Business owners or verified legal entities', infoRequired: 'Business name, license ID, director name', approval: 'Admin approval', page: 'open-business' },
        { key: 'Government', name: 'Government Account', icon: <Landmark size={40} color={COLORS.primaryAccent} />, description: 'Used by ministries, agencies, and state-owned enterprises. Receives treasury funds.', appliesTo: 'Government ministers, agencies, SOEs', infoRequired: 'Ministry name, position, internal code', approval: 'Admin-only', page: 'open-government' },
        { key: 'CreditCard', name: 'Credit Card Account', icon: <CreditCard size={40} color={COLORS.primaryAccent} />, description: 'A credit-based line account, not a physical wallet. Linked to credit score.', appliesTo: 'Users w/ credit score ≥ 300', infoRequired: 'Employment info (IC), credit agreement', approval: 'Admin review or auto if score high', page: 'open-creditcard' },
        { key: 'Investment', name: 'Investment Account', icon: <TrendingUp size={40} color={COLORS.primaryAccent} />, description: 'For advanced users. Used for purchasing bonds, stocks, and tracking returns.', appliesTo: 'Verified, adult users', infoRequired: 'Risk profile, bank link, investment interest', approval: 'Auto-approved or flagged', page: 'open-investment', comingSoon: true },
        { key: 'Shadow', name: 'Shadow Account', icon: <UserRoundSearch size={40} color={COLORS.primaryAccent} />, description: 'Classified/Hidden account for espionage, secret state funding, or corrupt actors.', appliesTo: 'Espionage, secret ops, or corruption RP', infoRequired: 'None (admin backend only)', approval: 'Admin-only creation', page: 'open-shadow', blurred: true },
    ];

    const handleOpenAccountClick = (account) => {
        if (account.comingSoon) {
            alert(`${account.name} is coming soon!`);
            return;
        }
        if (account.blurred && !userProfile.isVIP) {
            alert('This account type is restricted to VIP customers only.');
            return;
        }
        setCurrentView(account.page);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-4xl font-extrabold mb-8 text-center drop-shadow-sm" style={{ color: COLORS.primaryAccent }}>✨ Open New Account</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accountTypes.map((account, index) => (
                    <GlassCard
                        key={index}
                        className={`p-6 flex flex-col items-center text-center cursor-pointer hover:shadow-xl transition-shadow duration-300 ${account.blurred && !userProfile.isVIP ? 'filter blur-sm grayscale' : ''}`}
                        style={{ boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}
                        onClick={() => handleOpenAccountClick(account)}
                    >
                        <div className="mb-4">{account.icon}</div>
                        <h3 className="text-xl font-semibold mb-2" style={{ color: COLORS.primaryAccent }}>
                            {account.name} {account.comingSoon && <span className="text-sm text-yellow-400">(Coming Soon)</span>}
                        </h3>
                        <p className="text-sm text-gray-400">{account.description}</p>
                        {account.blurred && !userProfile.isVIP && <p className="text-red-500 font-bold mt-2">VIP Access Only</p>}
                    </GlassCard>
                ))}
            </div>
        </div>
    );
};

export default OpenAccountPage;
