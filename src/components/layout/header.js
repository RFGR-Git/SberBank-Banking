import React from 'react';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { COLORS } from '../../constants';

const Header = ({ currentView, navigationHistory, goBack, handleHomeClick, isLoggedIn, userProfile, handleSignOut, isAdminLoggedIn }) => {
    return (
        <header className="bg-gradient-to-r from-[#006644] to-[#003322] text-white p-4 shadow-lg flex justify-between items-center rounded-b-lg">
            <div className="flex items-center">
                {/* Back Arrow */}
                {navigationHistory.length > 1 && currentView !== 'home' && (
                    <button onClick={goBack} className="mr-3 p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors duration-200">
                        <ArrowLeft size={24} color={COLORS.primaryAccent} />
                    </button>
                )}
                {/* Favicon and Title */}
                <div onClick={handleHomeClick} className="flex items-center cursor-pointer">
                    <img src="https://placehold.co/40x40/00FFAA/0D0D0D?text=SB" alt="Sberbank Logo" className="mr-3 rounded-full" />
                    <h1 className="text-3xl font-bold tracking-tight" style={{ color: COLORS.primaryAccent }}>Sberbank</h1>
                </div>
                {isLoggedIn && userProfile && !isAdminLoggedIn && <span className="ml-4 text-sm opacity-80">Client Portal | User ID: {userProfile.discordId}</span>}
                {isLoggedIn && userProfile && isAdminLoggedIn && <span className="ml-4 text-sm opacity-80">Admin Portal | User ID: {userProfile.discordId}</span>}
            </div>
            <nav>
                <ul className="flex space-x-6">
                    {isLoggedIn && userProfile && (
                        <li className="relative group">
                            <button className="flex items-center space-x-2 text-white hover:text-opacity-80 transition-colors duration-200">
                                <img src="https://placehold.co/30x30/00FFAA/0D0D0D?text=👤" alt="User Avatar" className="rounded-full border border-green-500" />
                                <span>Profile</span>
                            </button>
                            {/* Profile Hover Card */}
                            <div className="absolute right-0 mt-2 w-72 p-4 bg-[#1A1A1A] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 transform translate-y-2 pointer-events-none group-hover:pointer-events-auto z-50">
                                <h3 className="text-xl font-bold mb-2" style={{ color: COLORS.primaryAccent }}>{userProfile.name || 'Guest User'}</h3>
                                <p className="text-sm flex items-center mb-1">
                                    KYC Code: {userProfile.kycCode || 'N/A'}
                                    {userProfile.kycCode && <CheckCircle size={16} color="green" className="ml-2" />}
                                </p>
                                <p className="text-sm mb-1">Region: {userProfile.region || 'N/A'}</p>
                                <p className="text-sm mb-1">Joined: {userProfile.dateJoined || 'N/A'}</p>
                                <p className="text-sm font-semibold mt-2" style={{ color: COLORS.primaryAccent }}>Accounts Open:</p>
                                <ul className="text-xs list-disc list-inside ml-2">
                                    {Object.entries(userProfile.accounts || {}).filter(([, balance]) => typeof balance === 'number' ? balance > 0 : Object.values(balance || {}).some(val => val > 0)).map(([type, balance]) => (
                                        <li key={type}>{type}: {typeof balance === 'number' ? balance.toFixed(2) : Object.keys(balance).map(curr => `${balance[curr].toFixed(2)} ${curr}`).join(', ')} RUB</li>
                                    ))}
                                    {Object.values(userProfile.accounts || {}).every(balance => (typeof balance === 'number' ? balance === 0 : Object.values(balance || {}).every(val => val === 0))) && (
                                        <li>No accounts opened yet.</li>
                                    )}
                                </ul>
                            </div>
                        </li>
                    )}
                    {isLoggedIn && (
                        <li>
                            <button
                                onClick={handleSignOut}
                                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-full shadow-md transition-all duration-200"
                            >
                                Sign Out
                            </button>
                        </li>
                    )}
                </ul>
            </nav>
        </header>
    );
};

export default Header;
