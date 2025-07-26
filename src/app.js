import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import HomePage from './components/HomePage';
import DashboardLayout from './components/DashboardLayout';
import AdminDashboardLayout from './components/AdminDashboardLayout';
import { COLORS } from './constants'; // Assuming COLORS is defined here
import GlassCard from './components/common/GlassCard'; // Make sure this path is correct

// Firebase global variables (provided by Canvas environment)
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

function App() {
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showLogin, setShowLogin] = useState(false); // State to control login form visibility
    const [loginDiscordId, setLoginDiscordId] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showRegister, setShowRegister] = useState(false); // State to control registration form visibility
    const [registerName, setRegisterName] = useState('');
    const [registerDiscordId, setRegisterDiscordId] = useState('');
    const [registerRegion, setRegisterRegion] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerInitialDeposit, setRegisterInitialDeposit] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDocRef = doc(db, `artifacts/${appId}/users`, user.uid);
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                    setUserProfile(docSnap.data());
                } else {
                    // If user exists in auth but not in Firestore, might be a new anonymous user
                    // or a deleted user. For now, we'll treat them as needing to register/login.
                    setUserProfile(null);
                    setShowLogin(true); // Show login if no profile found
                }
            } else {
                setUserProfile(null);
                setShowLogin(true); // Show login if no user is authenticated
            }
            setLoading(false);
        });

        const signIn = async () => {
            try {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Error signing in:", error);
                alert("Failed to sign in. Please try again.");
            }
        };

        signIn(); // Attempt to sign in on app load

        return () => unsubscribe();
    }, []); // Empty dependency array means this runs once on mount

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // In a real app, you'd verify password against a stored hash.
            // For this simulation, we'll just find the user by Discord ID and check if password matches (conceptually).
            const usersRef = collection(db, `artifacts/${appId}/users`);
            const q = query(usersRef, where("discordId", "==", loginDiscordId));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                // Conceptual password check (replace with actual bcrypt/hashing in production)
                if (userData.password === loginPassword) { // DANGER: Never store plain passwords in production
                    setUserProfile(userData);
                    setShowLogin(false);
                    alert('Login successful!');
                } else {
                    alert('Invalid Discord ID or Password.');
                }
            } else {
                alert('User not found. Please register or check your Discord ID.');
            }
        } catch (error) {
            console.error("Login error:", error);
            alert(`Login failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (parseFloat(registerInitialDeposit) < 100) {
            alert('Initial deposit must be at least 100 RUB.');
            setLoading(false);
            return;
        }

        try {
            // Check if Discord ID or Bank ID already exists
            const usersRef = collection(db, `artifacts/${appId}/users`);
            const qDiscord = query(usersRef, where("discordId", "==", registerDiscordId));
            const discordSnapshot = await getDocs(qDiscord);
            if (!discordSnapshot.empty) {
                alert('A user with this Discord ID already exists.');
                setLoading(false);
                return;
            }

            // Generate a simple Bank ID (e.g., SBR-BANK-XXXX)
            const bankId = `SBR-BANK-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
            const kycCode = `KYC-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

            const newUserId = auth.currentUser.uid; // Use Firebase Auth UID as the document ID

            const newProfile = {
                id: newUserId, // Store the Firebase Auth UID
                name: registerName,
                discordId: registerDiscordId,
                bankId: bankId,
                kycCode: kycCode,
                region: registerRegion,
                password: registerPassword, // DANGER: Never store plain passwords in production
                balance: 0, // Initial balance before deposit is processed
                accounts: {}, // Accounts will be populated upon approval
                transactions: [],
                dateJoined: new Date().toLocaleDateString('en-US'),
                creditScore: 500, // Default credit score
                hasCreditCard: false,
                isFrozen: false, // Not frozen by default
                specialRole: 'User', // Default role
                isBusinessOwner: false,
                businessRegistrationId: null, // New field for business linking
                loanHistory: [],
                isLoanBlacklisted: false,
                isCreditFrozen: false, // For credit overuse penalties
                creditFreezeEndDate: null,
                isCreditCardSuspended: false,
                creditCardSuspensionEndDate: null,
                newLoanBlockedEndDate: null,
                isSuspicious: false,
                triggerInternalAffairs: false
            };

            await setDoc(doc(db, `artifacts/${appId}/users`, newUserId), newProfile);

            // Submit an account creation request for admin approval
            const accountRequestData = {
                userId: newUserId,
                userName: registerName,
                discordId: registerDiscordId,
                accountType: 'Personal', // Default to personal account on registration
                initialDeposit: parseFloat(registerInitialDeposit),
                status: 'Pending',
                timestamp: new Date().toISOString(),
                discordMessageLink: `https://discord.com/channels/@me/${registerDiscordId}` // Example link for proof
            };
            await addDoc(collection(db, `artifacts/${appId}/public/data/accountRequests`), accountRequestData);


            setUserProfile(newProfile); // Set profile immediately, but account is pending approval
            setShowRegister(false);
            setShowLogin(false);
            alert('Registration successful! Your account is pending admin approval for initial deposit and personal account creation.');

        } catch (error) {
            console.error("Registration error:", error);
            alert(`Registration failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: COLORS.background, color: COLORS.typography }}>
                <p className="text-xl">Loading application...</p>
            </div>
        );
    }

    // Render Admin Dashboard if user has 'Admin' or 'Super Admin' role
    if (userProfile && (userProfile.specialRole === 'Admin' || userProfile.specialRole === 'Super Admin')) {
        return <AdminDashboardLayout setUserProfile={setUserProfile} db={db} appId={appId} auth={auth} userProfile={userProfile} />;
    }

    // Render User Dashboard if user is logged in and not an admin
    if (userProfile) {
        return <DashboardLayout userProfile={userProfile} setUserProfile={setUserProfile} db={db} appId={appId} auth={auth} />;
    }

    // Render Home Page with Login/Register forms if not logged in
    return (
        <HomePage
            showLogin={showLogin}
            setShowLogin={setShowLogin}
            handleLogin={handleLogin}
            loginDiscordId={loginDiscordId}
            setLoginDiscordId={setLoginDiscordId}
            loginPassword={loginPassword}
            setLoginPassword={setLoginPassword}
            showRegister={showRegister}
            setShowRegister={setShowRegister}
            handleRegister={handleRegister}
            registerName={registerName}
            setRegisterName={setRegisterName}
            registerDiscordId={registerDiscordId}
            setRegisterDiscordId={setRegisterDiscordId}
            registerRegion={registerRegion}
            setRegisterRegion={setRegisterRegion}
            registerPassword={registerPassword}
            setRegisterPassword={setRegisterPassword}
            registerInitialDeposit={registerInitialDeposit}
            setRegisterInitialDeposit={setRegisterInitialDeposit}
        />
    );
}

export default App;
