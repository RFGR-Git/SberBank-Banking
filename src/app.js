import React, { useState, useEffect } from 'react';
import { auth, db } from './firebaseConfig'; // Import auth and db from firebaseConfig
import { onAuthStateChanged, signOut } from 'firebase/auth'; // Removed signInAnonymously, signInWithCustomToken
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './components/HomePage';
import DashboardLayout from './components/DashboardLayout';
import OpenAccountPage from './components/OpenAccountPage';
import OpenSpecificAccountPage from './components/OpenSpecificAccountPage';
import BankingServicesLayout from './components/BankingServicesLayout';
import LoanCreditSystemLayout from './components/LoanCreditSystemLayout';
import BusinessBankingLayout from './components/BusinessBankingLayout';
import CardDigitalPaymentSystemLayout from './components/CardDigitalPaymentSystemLayout';
import FinancialReportsAndToolsLayout from './components/FinancialReportsAndToolsLayout';
import SecurityIdentityVerificationLayout from './components/SecurityIdentityVerificationLayout';
import GovernmentPortalLayout from './components/GovernmentPortalLayout';
import AdminDashboardLayout from './components/AdminDashboardLayout';

import { COLORS } from './constants';

// The __app_id is provided by the Canvas environment. For local hosting, a default is used.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const App = () => {
    const [currentView, setCurrentView] = useState('home');
    const [navigationHistory, setNavigationHistory] = useState(['home']);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [authReady, setAuthReady] = useState(false); // State to track if Firebase auth is initialized

    // Effect for Firebase Authentication state changes
    useEffect(() => {
        if (!auth) {
            setAuthReady(true);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log("App.js: User authenticated:", user.uid);
                const userDocRef = doc(db, `artifacts/${appId}/users`, user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    setUserProfile(userData);
                    setIsLoggedIn(true);
                    if (userData.isAdmin) {
                        setIsAdminLoggedIn(true);
                        console.log("App.js: Admin user detected. isAdminLoggedIn set to true.");
                        setCurrentView('admin-dashboard');
                    } else {
                        setIsAdminLoggedIn(false);
                        console.log("App.js: Regular user detected. isAdminLoggedIn set to false.");
                        setCurrentView('dashboard');
                    }
                } else {
                    console.warn("App.js: User document not found for authenticated user:", user.uid);
                    setIsLoggedIn(false);
                    setUserProfile(null);
                    setCurrentView('home');
                    await signOut(auth);
                }
            } else {
                console.log("App.js: No user authenticated.");
                setIsLoggedIn(false);
                setIsAdminLoggedIn(false);
                setUserProfile(null);
                setCurrentView('home');
            }
            setAuthReady(true);
        });

        // No automatic sign-in here. User must log in via HomePage.
        // authReady is set to true immediately if 'auth' object exists,
        // allowing the HomePage to render and handle explicit login/registration.
        setAuthReady(true); 

        return () => unsubscribe();
    }, []);

    // Effect for real-time user profile updates from Firestore
    useEffect(() => {
        if (!authReady || !isLoggedIn || !auth.currentUser || !db) return;

        const userDocRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setUserProfile(docSnap.data());
            } else {
                console.log("App.js: User profile no longer exists in Firestore.");
                setIsLoggedIn(false);
                setIsAdminLoggedIn(false);
                setUserProfile(null);
                setCurrentView('home');
            }
        }, (error) => {
            console.error("App.js: Error listening to user profile:", error);
        });

        return () => unsubscribe();
    }, [authReady, isLoggedIn, auth.currentUser?.uid]);

    // Navigation functions
    const navigateTo = (view) => {
        setNavigationHistory(prev => [...prev, view]);
        setCurrentView(view);
    };

    const goBack = () => {
        setNavigationHistory(prev => {
            const newHistory = prev.slice(0, prev.length - 1);
            if (newHistory.length > 0) {
                setCurrentView(newHistory[newHistory.length - 1]);
            } else {
                setCurrentView('home');
            }
            return newHistory;
        });
    };

    const handleHomeClick = () => {
        setNavigationHistory(['home']);
        setCurrentView('home');
    };

    // Handle user sign out
    const handleSignOut = async () => {
        if (auth) {
            try {
                await signOut(auth);
                console.log("App.js: User signed out.");
            } catch (error) {
                console.error("App.js: Error signing out:", error);
            }
        }
        setIsLoggedIn(false);
        setIsAdminLoggedIn(false);
        setUserProfile(null);
        handleHomeClick();
    };

    // Conditional rendering of views based on login status and currentView state
    const renderCurrentView = () => {
        if (!authReady) {
            return <div className="text-center py-16 text-xl" style={{ color: COLORS.typography }}>Loading application...</div>;
        }

        if (!isLoggedIn && currentView === 'home') {
            return (
                <HomePage
                    setIsLoggedIn={setIsLoggedIn}
                    setIsAdminLoggedIn={setIsAdminLoggedIn}
                    setUserProfile={setUserProfile}
                    setCurrentView={navigateTo}
                    auth={auth}
                    db={db}
                    appId={appId}
                />
            );
        } else if (isLoggedIn && !isAdminLoggedIn && userProfile) {
            switch (currentView) {
                case 'dashboard':
                    return <DashboardLayout userProfile={userProfile} setCurrentView={navigateTo} db={db} appId={appId} auth={auth} />;
                case 'open-account':
                    return <OpenAccountPage userProfile={userProfile} setUserProfile={setUserProfile} setCurrentView={navigateTo} />;
                case 'banking-services':
                    return <BankingServicesLayout userProfile={userProfile} setUserProfile={setUserProfile} db={db} appId={appId} auth={auth} />;
                case 'loans-credit':
                    return <LoanCreditSystemLayout userProfile={userProfile} setUserProfile={setUserProfile} db={db} appId={appId} auth={auth} />;
                case 'business-banking':
                    return <BusinessBankingLayout userProfile={userProfile} db={db} appId={appId} auth={auth} />;
                case 'cards-payments':
                    return <CardDigitalPaymentSystemLayout userProfile={userProfile} setUserProfile={setUserProfile} db={db} appId={appId} auth={auth} />;
                case 'reports-tools':
                    return <FinancialReportsAndToolsLayout userProfile={userProfile} setUserProfile={setUserProfile} db={db} appId={appId} auth={auth} />;
                case 'security':
                    return <SecurityIdentityVerificationLayout />;
                case 'government-portal':
                    return <GovernmentPortalLayout />;
                case 'open-personal':
                    return <OpenSpecificAccountPage type="Personal" userProfile={userProfile} setUserProfile={setUserProfile} setCurrentView={navigateTo} db={db} appId={appId} auth={auth} />;
                case 'open-savings':
                    return <OpenSpecificAccountPage type="Savings" userProfile={userProfile} setUserProfile={setUserProfile} setCurrentView={navigateTo} db={db} appId={appId} auth={auth} />;
                case 'open-business':
                    return <OpenSpecificAccountPage type="Business" userProfile={userProfile} setUserProfile={setUserProfile} setCurrentView={navigateTo} db={db} appId={appId} auth={auth} />;
                case 'open-creditcard':
                    return <OpenSpecificAccountPage type="CreditCard" userProfile={userProfile} setUserProfile={setUserProfile} setCurrentView={navigateTo} db={db} appId={appId} auth={auth} />;
                case 'open-investment':
                    return <OpenSpecificAccountPage type="Investment" userProfile={userProfile} setUserProfile={setUserProfile} setCurrentView={navigateTo} db={db} appId={appId} auth={auth} />;
                case 'open-shadow':
                    return <OpenSpecificAccountPage type="Shadow" userProfile={userProfile} setUserProfile={setUserProfile} setCurrentView={navigateTo} db={db} appId={appId} auth={auth} />;
                default:
                    return <DashboardLayout userProfile={userProfile} setCurrentView={navigateTo} db={db} appId={appId} auth={auth} />;
            }
        } else if (isAdminLoggedIn && userProfile) {
            return <AdminDashboardLayout setUserProfile={setUserProfile} db={db} appId={appId} auth={auth} />;
        }
        return null;
    };

    return (
        <div className="min-h-screen font-sans flex flex-col" style={{ backgroundColor: COLORS.background, color: COLORS.typography }}>
            <Header
                currentView={currentView}
                navigationHistory={navigationHistory}
                goBack={goBack}
                handleHomeClick={handleHomeClick}
                isLoggedIn={isLoggedIn}
                userProfile={userProfile}
                handleSignOut={handleSignOut}
                isAdminLoggedIn={isAdminLoggedIn}
            />
            <main className="flex-grow p-8">
                {renderCurrentView()}
            </main>
            <Footer />
        </div>
    );
};

export default App;
