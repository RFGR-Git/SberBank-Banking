import React, { useState, useEffect } from 'react';
import { auth, db } from './firebaseConfig'; // Import auth and db from firebaseConfig
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken, signOut } from 'firebase/auth';
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
        // If Firebase auth is not initialized (e.g., missing config), mark as ready and return.
        if (!auth) {
            setAuthReady(true);
            return;
        }

        // Set up listener for authentication state changes
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log("App.js: User authenticated:", user.uid);
                // Fetch user profile from Firestore upon successful authentication
                const userDocRef = doc(db, `artifacts/${appId}/users`, user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    setUserProfile(userData);
                    setIsLoggedIn(true);
                    // Check for admin role from Firestore data
                    if (userData.isAdmin) {
                        setIsAdminLoggedIn(true);
                        console.log("App.js: Admin user detected. isAdminLoggedIn set to true."); // <-- ADDED LOG
                        setCurrentView('admin-dashboard'); // Redirect admin to admin dashboard
                    } else {
                        setIsAdminLoggedIn(false);
                        console.log("App.js: Regular user detected. isAdminLoggedIn set to false."); // <-- ADDED LOG
                        setCurrentView('dashboard'); // Redirect regular user to dashboard
                    }
                } else {
                    console.warn("App.js: User document not found for authenticated user:", user.uid);
                    // If user is authenticated but no profile, log them out and reset state
                    setIsLoggedIn(false);
                    setUserProfile(null);
                    setCurrentView('home');
                    await signOut(auth); // Ensure user is fully logged out if profile is missing
                }
            } else {
                console.log("App.js: No user authenticated.");
                // Reset states if no user is authenticated
                setIsLoggedIn(false);
                setIsAdminLoggedIn(false);
                setUserProfile(null);
                setCurrentView('home');
            }
            setAuthReady(true); // Mark auth as ready after initial check
        });

        // Attempt anonymous sign-in or custom token sign-in if available
        const initialSignIn = async () => {
            if (typeof __initial_auth_token !== 'undefined' && auth) {
                try {
                    await signInWithCustomToken(auth, __initial_auth_token);
                    console.log("App.js: Signed in with custom token.");
                } catch (error) {
                    console.error("App.js: Error signing in with custom token:", error);
                    // Fallback to anonymous sign-in if custom token fails
                    try {
                        await signInAnonymously(auth);
                        console.log("App.js: Signed in anonymously as fallback.");
                    } catch (anonError) {
                        console.error("App.js: Error signing in anonymously:", anonError);
                    }
                }
            } else if (auth) {
                // If no custom token, try anonymous sign-in
                try {
                    await signInAnonymously(auth);
                    console.log("App.js: Signed in anonymously.");
                } catch (error) {
                    console.error("App.js: Error signing in anonymously:", error);
                }
            }
        };

        if (auth) {
            initialSignIn(); // Call the initial sign-in logic
        }

        return () => unsubscribe(); // Clean up the auth listener on component unmount
    }, []); // Empty dependency array means this effect runs once on mount

    // Effect for real-time user profile updates from Firestore
    useEffect(() => {
        // Only set up listener if auth is ready, user is logged in, current user exists, and db is available
        if (!authReady || !isLoggedIn || !auth.currentUser || !db) return;

        const userDocRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setUserProfile(docSnap.data()); // Update user profile state with latest data
            } else {
                console.log("App.js: User profile no longer exists in Firestore.");
                // If user document is deleted, log them out and reset state
                setIsLoggedIn(false);
                setIsAdminLoggedIn(false);
                setUserProfile(null);
                setCurrentView('home');
            }
        }, (error) => {
            console.error("App.js: Error listening to user profile:", error);
        });

        return () => unsubscribe(); // Clean up the Firestore listener on unmount or dependency change
    }, [authReady, isLoggedIn, auth.currentUser?.uid]); // Re-run if authReady, isLoggedIn, or current user UID changes

    // Navigation functions
    const navigateTo = (view) => {
        setNavigationHistory(prev => [...prev, view]); // Add current view to history
        setCurrentView(view); // Set new current view
    };

    const goBack = () => {
        setNavigationHistory(prev => {
            const newHistory = prev.slice(0, prev.length - 1); // Remove last item from history
            if (newHistory.length > 0) {
                setCurrentView(newHistory[newHistory.length - 1]); // Navigate to previous view
            } else {
                setCurrentView('home'); // Fallback to home if no history
            }
            return newHistory;
        });
    };

    const handleHomeClick = () => {
        setNavigationHistory(['home']); // Reset history to just home
        setCurrentView('home'); // Navigate to home
    };

    // Handle user sign out
    const handleSignOut = async () => {
        if (auth) {
            try {
                await signOut(auth); // Sign out from Firebase Auth
                console.log("App.js: User signed out.");
            } catch (error) {
                console.error("App.js: Error signing out:", error);
            }
        }
        // Reset all user-related states
        setIsLoggedIn(false);
        setIsAdminLoggedIn(false);
        setUserProfile(null);
        handleHomeClick(); // Navigate to home page after sign out
    };

    // Conditional rendering of views based on login status and currentView state
    const renderCurrentView = () => {
        if (!authReady) {
            return <div className="text-center py-16 text-xl" style={{ color: COLORS.typography }}>Loading application...</div>;
        }

        if (!isLoggedIn && currentView === 'home') {
            // Show HomePage if not logged in and current view is home
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
            // Show user dashboard and related pages if logged in as a regular user
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
            // Show AdminDashboard if logged in as admin
            return <AdminDashboardLayout setUserProfile={setUserProfile} db={db} appId={appId} auth={auth} />;
        }
        return null; // Fallback, should ideally not be reached
    };

    return (
        <div className="min-h-screen font-sans flex flex-col" style={{ backgroundColor: COLORS.background, color: COLORS.typography }}>
            {/* Header component */}
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
            {/* Main content area */}
            <main className="flex-grow p-8">
                {renderCurrentView()}
            </main>
            {/* Footer component */}
            <Footer />
        </div>
    );
};

export default App;
