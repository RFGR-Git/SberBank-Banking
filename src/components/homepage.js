import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import GlassCard from './common/GlassCard';
import { COLORS, REGION_CODES } from '../constants';

const HomePage = ({ setIsLoggedIn, setIsAdminLoggedIn, setUserProfile, setCurrentView, auth, db, appId }) => {
    const [rpName, setRpName] = useState('');
    const [dob, setDob] = useState('');
    const [placeOfBirth, setPlaceOfBirth] = useState('');
    const [region, setRegion] = useState('');
    const [gender, setGender] = useState('');
    const [discordId, setDiscordId] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [occupation, setOccupation] = useState('');
    const [citizenshipStatus, setCitizenshipStatus] = useState('');
    const [rpIdNumber, setRpIdNumber] = useState('');

    const [isRegistering, setIsRegistering] = useState(true);
    const [isAdminLogin, setIsAdminLogin] = useState(false);

    const generateKycCode = (selectedRegion) => {
        const uniqueId = Math.floor(1000 + Math.random() * 9000); // 4-digit ID
        const regionCode = REGION_CODES[selectedRegion] || 'UNK'; // UNK for unknown region
        const year = new Date().getFullYear();
        return `KYC-${uniqueId}-${regionCode}-${year}`;
    };

    const handleUserRegister = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }
        if (password.length < 6) { // Example complexity
            alert('Password must be at least 6 characters long.');
            return;
        }

        try {
            // Firebase Auth requires an email format. Use a sanitized Discord ID for the email.
            const email = discordId.replace(/[^a-zA-Z0-9]/g, '') + "@sberbank.com";
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const newKycCode = generateKycCode(region);
            const currentDate = new Date().toLocaleDateString('en-US'); // Consistent date format

            const newUserProfile = {
                uid: user.uid,
                name: rpName,
                discordId,
                dob,
                placeOfBirth,
                region,
                gender,
                occupation,
                citizenshipStatus,
                rpIdNumber,
                kycCode: newKycCode,
                dateJoined: currentDate,
                balance: 0.00,
                creditScore: 360, // All new users start at 360
                hasCreditCard: false,
                debitCard: null,
                accounts: {
                    Personal: 0.00,
                    Savings: 0.00,
                    Business: 0.00,
                    Government: 0.00,
                    Investment: 0.00,
                    CreditCard: 0.00,
                    Shadow: 0.00,
                },
                transactions: [],
                budget: { income: 0, expenses: [] },
                investments: [],
                isVIP: false,
                isAdmin: false, // Ensure regular users are not admins
            };

            await setDoc(doc(db, `artifacts/${appId}/users`, user.uid), newUserProfile);

            setUserProfile(newUserProfile);
            setIsLoggedIn(true);
            setIsAdminLoggedIn(false);
            setCurrentView('dashboard');
            alert('Registration successful! You can now open accounts from your dashboard.');
        } catch (error) {
            console.error("Error during registration:", error);
            alert(`Registration failed: ${error.message}`);
        }
    };

    const handleUserLogin = async (e) => {
        e.preventDefault();
        if (!discordId || !password) {
            alert('Please enter Discord ID and Password.');
            return;
        }

        try {
            const email = discordId.replace(/[^a-zA-Z0-9]/g, '') + "@sberbank.com";
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const userDocRef = doc(db, `artifacts/${appId}/users`, user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                setUserProfile(userData);
                setIsLoggedIn(true);
                setIsAdminLoggedIn(userData.isAdmin || false); // Set admin status from Firestore
                setCurrentView(userData.isAdmin ? 'admin-dashboard' : 'dashboard');
            } else {
                alert('User profile not found. Please register.');
                await signOut(auth); // Sign out the partial user
            }
        } catch (error) {
            console.error("Error during login:", error);
            alert(`Login failed: ${error.message}`);
        }
    };

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        const adminEmail = "admin@sberbank.com"; // Fixed admin email
        const adminPass = "adminpass"; // Fixed admin password

        if (discordId !== 'Admin#0000' || password !== adminPass) {
            alert('Invalid admin credentials.');
            return;
        }

        try {
            let adminUser = null;
            try {
                // Try to sign in the admin
                const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPass);
                adminUser = userCredential.user;
            } catch (loginError) {
                // If admin user not found, create it (first time setup)
                if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/wrong-password') {
                    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
                    adminUser = userCredential.user;
                    // Set admin profile in Firestore
                    await setDoc(doc(db, `artifacts/${appId}/users`, adminUser.uid), {
                        uid: adminUser.uid,
                        name: 'Sberbank Admin',
                        discordId: 'Admin#0000',
                        kycCode: 'KYC-ADMIN-SBR-2025',
                        dateJoined: new Date().toLocaleDateString('en-US'),
                        region: 'Headquarters',
                        isVIP: true, // Admins are VIP
                        isAdmin: true, // Mark as admin
                        balance: 0.00, // Admin starts with 0, can add funds later
                        creditScore: 850,
                        hasCreditCard: true,
                        debitCard: null, // Admin card can be generated later
                        accounts: {
                            Personal: 0.00, Savings: 0.00, Business: 0.00, Government: 0.00, Investment: 0.00, CreditCard: 0.00, Shadow: 0.00
                        },
                        transactions: [], budget: { income: 0, expenses: [] }, investments: [],
                    });
                    alert('Admin account created and logged in.');
                } else {
                    throw loginError; // Re-throw other Firebase errors
                }
            }

            if (adminUser) {
                const adminDocRef = doc(db, `artifacts/${appId}/users`, adminUser.uid);
                const adminDocSnap = await getDoc(adminDocRef);
                if (adminDocSnap.exists() && adminDocSnap.data().isAdmin) {
                    setUserProfile(adminDocSnap.data());
                    setIsLoggedIn(true);
                    setIsAdminLoggedIn(true);
                    setCurrentView('admin-dashboard');
                } else {
                    alert('Admin profile not found or not marked as admin. Please ensure correct credentials and admin role.');
                    await signOut(auth);
                }
            }
        } catch (error) {
            console.error("Error during admin login:", error);
            alert(`Admin login failed: ${error.message}`);
        }
    };


    return (
        <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-160px)]">
            <GlassCard className="p-10 w-full max-w-md text-center">
                <h2 className="text-4xl font-extrabold mb-8 drop-shadow-sm" style={{ color: COLORS.primaryAccent }}>Welcome to Sberbank</h2>

                <div className="flex justify-center mb-6 space-x-4">
                    <button
                        onClick={() => { setIsRegistering(true); setIsAdminLogin(false); }}
                        className={`px-6 py-2 rounded-full font-bold transition-all duration-300 ${isRegistering && !isAdminLogin ? 'bg-green-700 text-white shadow-lg' : 'bg-transparent text-gray-400 border border-gray-600'}`}
                        style={isRegistering && !isAdminLogin ? { boxShadow: `0 0 10px ${COLORS.buttonsGlow}` } : {}}
                    >
                        Register
                    </button>
                    <button
                        onClick={() => { setIsRegistering(false); setIsAdminLogin(false); }}
                        className={`px-6 py-2 rounded-full font-bold transition-all duration-300 ${!isRegistering && !isAdminLogin ? 'bg-green-700 text-white shadow-lg' : 'bg-transparent text-gray-400 border border-gray-600'}`}
                        style={!isRegistering && !isAdminLogin ? { boxShadow: `0 0 10px ${COLORS.buttonsGlow}` } : {}}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => { setIsAdminLogin(true); setIsRegistering(false); }}
                        className={`px-6 py-2 rounded-full font-bold transition-all duration-300 ${isAdminLogin ? 'bg-red-700 text-white shadow-lg' : 'bg-transparent text-gray-400 border border-gray-600'}`}
                        style={isAdminLogin ? { boxShadow: `0 0 10px rgba(255, 0, 0, 0.5)` } : {}}
                    >
                        Admin Login
                    </button>
                </div>

                {isAdminLogin ? (
                    <form onSubmit={handleAdminLogin} className="space-y-6">
                        <p className="text-lg mb-2" style={{ color: COLORS.typography }}>Admin Login</p>
                        <div>
                            <label htmlFor="adminDiscordId" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Admin Discord ID</label>
                            <input
                                type="text"
                                id="adminDiscordId"
                                value={discordId}
                                onChange={(e) => setDiscordId(e.target.value)}
                                placeholder="Admin#0000"
                                className="w-full p-3 border border-gray-600 rounded-lg focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                                style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="adminPassword" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Password</label>
                            <input
                                type="password"
                                id="adminPassword"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="********"
                                className="w-full p-3 border border-gray-600 rounded-lg focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                                style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300"
                            style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 15px ${COLORS.buttonsGlow}` }}
                        >
                            Admin Login
                        </button>
                    </form>
                ) : isRegistering ? (
                    <form onSubmit={handleUserRegister} className="space-y-6">
                        <p className="text-lg mb-2" style={{ color: COLORS.typography }}>Create your new Sberbank website account.</p>
                        {/* Basic Roleplay Details */}
                        <h3 className="text-xl font-semibold mt-6" style={{ color: COLORS.primaryAccent }}>Basic Roleplay Details</h3>
                        <div>
                            <label htmlFor="rpName" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Roleplay Name</label>
                            <input type="text" id="rpName" value={rpName} onChange={(e) => setRpName(e.target.value)} placeholder="Comrade Ivanov" className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                        </div>
                        <div>
                            <label htmlFor="dob" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Date of Birth</label>
                            <input type="date" id="dob" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                        </div>
                        <div>
                            <label htmlFor="placeOfBirth" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Place of Birth</label>
                            <input type="text" id="placeOfBirth" value={placeOfBirth} onChange={(e) => setPlaceOfBirth(e.target.value)} placeholder="Volgograd" className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                        </div>
                        <div>
                            <label htmlFor="region" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Current Region of Residence</label>
                            <select id="region" value={region} onChange={(e) => setRegion(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required>
                                <option value="">Select Region</option>
                                {Object.keys(REGION_CODES).map(regionName => (
                                    <option key={regionName} value={regionName}>{regionName}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="gender" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Gender (Optional)</label>
                            <input type="text" id="gender" value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Male/Female/Other" className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        </div>

                        {/* Account Credentials */}
                        <h3 className="text-xl font-semibold mt-6" style={{ color: COLORS.primaryAccent }}>Account Credentials</h3>
                        <div>
                            <label htmlFor="discordId" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Discord User ID (e.g., YourDiscord#1234)</label>
                            <input type="text" id="discordId" value={discordId} onChange={(e) => setDiscordId(e.target.value)} placeholder="YourDiscord#1234" className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Create Password</label>
                            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                        </div>
                        <div>
                            <label htmlFor="confirmPassword" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Confirm Password</label>
                            <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="********" className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                        </div>

                        {/* Additional RP Role Information (Optional) */}
                        <h3 className="text-xl font-semibold mt-6" style={{ color: COLORS.primaryAccent }}>Additional RP Role Information (Optional)</h3>
                        <div>
                            <label htmlFor="occupation" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Occupation or Role in RP</label>
                            <input type="text" id="occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="Citizen, Business Owner, etc." className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        </div>
                        <div>
                            <label htmlFor="citizenshipStatus" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Citizenship Status or Immigration Status</label>
                            <input type="text" id="citizenshipStatus" value={citizenshipStatus} onChange={(e) => setCitizenshipStatus(e.target.value)} placeholder="Citizen, Immigrant" className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        </div>
                        <div>
                            <label htmlFor="rpIdNumber" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>RP Identification Number (if applicable)</label>
                            <input type="text" id="rpIdNumber" value={rpIdNumber} onChange={(e) => setRpIdNumber(e.target.value)} placeholder="RP-XXXX-YYYY" className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        </div>

                        <button
                            type="submit"
                            className="w-full font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300"
                            style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 15px ${COLORS.buttonsGlow}` }}
                        >
                            Register Account
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleUserLogin} className="space-y-6">
                        <p className="text-lg mb-2" style={{ color: COLORS.typography }}>Log in to your existing account.</p>
                        <div>
                            <label htmlFor="loginDiscordId" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Discord User ID</label>
                            <input
                                type="text"
                                id="loginDiscordId"
                                value={discordId}
                                onChange={(e) => setDiscordId(e.target.value)}
                                placeholder="YourDiscord#1234"
                                className="w-full p-3 border border-gray-600 rounded-lg focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                                style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="loginPassword" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Password</label>
                            <input
                                type="password"
                                id="loginPassword"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="********"
                                className="w-full p-3 border border-gray-600 rounded-lg focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                                style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300"
                            style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 15px ${COLORS.buttonsGlow}` }}
                        >
                            Login
                        </button>
                    </form>
                )}
            </GlassCard>
        </div>
    );
};

export default HomePage;
