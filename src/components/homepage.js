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
    const [discordId, setDiscordId] = useState(''); // This state holds the Discord ID input
    const [password, setPassword] = useState('');   // This state holds the password input
    const [confirmPassword, setConfirmPassword] = useState('');
    const [occupation, setOccupation] = useState('');
    const [citizenshipStatus, setCitizenshipStatus] = useState('');
    const [rpIdNumber, setRpIdNumber] = useState('');

    const [isRegistering, setIsRegistering] = useState(true);
    const [isAdminLogin, setIsAdminLogin] = useState(false);

    // Function to generate a KYC code based on selected region and a unique ID
    const generateKycCode = (selectedRegion) => {
        const uniqueId = Math.floor(1000 + Math.random() * 9000); // 4-digit ID
        const regionCode = REGION_CODES[selectedRegion] || 'UNK'; // Use region code or 'UNK' for unknown
        const year = new Date().getFullYear();
        return `KYC-${uniqueId}-${regionCode}-${year}`;
    };

    // Function to generate a unique 8-digit bank ID
    const generateBankId = () => {
        return Math.floor(10000000 + Math.random() * 90000000).toString();
    };

    // Handle user registration
    const handleUserRegister = async (e) => {
        e.preventDefault(); // Prevent default form submission
        if (password !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }
        if (password.length < 6) { // Basic password complexity check
            alert('Password must be at least 6 characters long.');
            return;
        }

        try {
            // Firebase Auth requires an email format. Convert Discord ID to an email-like string.
            const email = discordId.replace(/[^a-zA-Z0-9]/g, '') + "@sberbank.com";
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const newKycCode = generateKycCode(region);
            const newBankId = generateBankId(); // Generate new bank ID
            const currentDate = new Date().toLocaleDateString('en-US'); // Get current date in consistent format

            // Create new user profile object with initial data
            const newUserProfile = {
                uid: user.uid,
                name: rpName,
                discordId,
                bankId: newBankId, // Store the generated bank ID
                dob,
                placeOfBirth,
                region,
                gender,
                occupation,
                citizenshipStatus,
                rpIdNumber,
                kycCode: newKycCode,
                dateJoined: currentDate,
                balance: 0.00, // Initial balance
                creditScore: 360, // All new users start at 360
                hasCreditCard: false,
                debitCard: null,
                accounts: { // Initialize all account types to 0
                    Personal: 0.00,
                    Savings: 0.00,
                    Business: 0.00,
                    Government: 0.00,
                    Investment: 0.00,
                    CreditCard: 0.00,
                    Shadow: 0.00,
                },
                transactions: [], // Empty array for transactions
                budget: { income: 0, expenses: [] }, // Initial budget
                investments: [], // Empty array for investments
                isVIP: false, // Not VIP by default
                isAdmin: false, // Not admin by default
                loanHistory: [], // New: Track loan history for credit checks
                missedPayments: 0, // New: Track missed payments for credit score
                lastPaymentDate: new Date().toISOString(), // New: For tracking payment frequency
            };

            // Save the new user profile to Firestore
            await setDoc(doc(db, `artifacts/${appId}/users`, user.uid), newUserProfile);

            // Update parent component state to reflect login
            setUserProfile(newUserProfile);
            setIsLoggedIn(true);
            setIsAdminLoggedIn(false);
            setCurrentView('dashboard'); // Navigate to dashboard
            alert(`Registration successful! Your Bank ID is: ${newBankId}. You can now open accounts from your dashboard.`);
        } catch (error) {
            console.error("Error during registration:", error);
            alert(`Registration failed: ${error.message}`);
        }
    };

    // Handle user login
    const handleUserLogin = async (e) => {
        e.preventDefault(); // Prevent default form submission
        if (!discordId || !password) {
            alert('Please enter Discord ID and Password.');
            return;
        }

        try {
            // Convert Discord ID back to the email-like format for Firebase Auth
            const email = discordId.replace(/[^a-zA-Z0-9]/g, '') + "@sberbank.com";
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Fetch user profile from Firestore
            const userDocRef = doc(db, `artifacts/${appId}/users`, user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                setUserProfile(userData);
                setIsLoggedIn(true);
                setIsAdminLoggedIn(userData.isAdmin || false); // Set admin status from Firestore data
                setCurrentView(userData.isAdmin ? 'admin-dashboard' : 'dashboard'); // Navigate based on admin status
            } else {
                alert('User profile not found. Please register.');
                await signOut(auth); // Sign out the user if their profile is missing
            }
        } catch (error) {
            console.error("Error during login:", error);
            alert(`Login failed: ${error.message}`);
        }
    };

    // Handle admin login
    const handleAdminLogin = async (e) => {
        e.preventDefault(); // Prevent default form submission
        const adminEmail = "admin@sberbank.com"; // Fixed admin email for Firebase Auth
        const adminPass = "adminpass"; // Fixed admin password

        // Trim whitespace from inputs for robust comparison
        const trimmedDiscordId = discordId.trim();
        const trimmedPassword = password.trim();

        console.log("Admin Login Attempt:");
        console.log("  Input Discord ID:", `'${trimmedDiscordId}'`, "Length:", trimmedDiscordId.length);
        console.log("  Expected Discord ID:", `'Admin#0000'`, "Length:", 'Admin#0000'.length);
        console.log("  Input Password:", `'${trimmedPassword}'`, "Length:", trimmedPassword.length);
        console.log("  Expected Password:", `'adminpass'`, "Length:", 'adminpass'.length);
        console.log("  Discord ID Match:", trimmedDiscordId === 'Admin#0000');
        console.log("  Password Match:", trimmedPassword === adminPass);

        // Check if provided credentials match the hardcoded admin credentials
        if (trimmedDiscordId !== 'Admin#0000' || trimmedPassword !== adminPass) {
            alert('Invalid admin credentials.');
            return;
        }

        try {
            let adminUser = null;
            try {
                // Attempt to sign in the admin user
                const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPass);
                adminUser = userCredential.user;
            } catch (loginError) {
                // If admin user not found (first time setup), create it
                if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/wrong-password' || loginError.code === 'auth/invalid-credential') {
                    console.log("Admin user not found or invalid credentials, attempting to create it.");
                    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
                    adminUser = userCredential.user;
                    // Set admin profile in Firestore upon creation
                    await setDoc(doc(db, `artifacts/${appId}/users`, adminUser.uid), {
                        uid: adminUser.uid,
                        name: 'Sberbank Admin',
                        discordId: 'Admin#0000',
                        bankId: '00000000', // Fixed bank ID for admin
                        kycCode: 'KYC-ADMIN-SBR-2025',
                        dateJoined: new Date().toLocaleDateString('en-US'),
                        region: 'Headquarters',
                        isVIP: true, // Admins are VIP
                        isAdmin: true, // Mark as admin
                        balance: 0.00,
                        creditScore: 850,
                        hasCreditCard: true,
                        debitCard: null,
                        accounts: {
                            Personal: 0.00, Savings: 0.00, Business: 0.00, Government: 0.00, Investment: 0.00, CreditCard: 0.00, Shadow: 0.00
                        },
                        transactions: [], budget: { income: 0, expenses: [] }, investments: [],
                        loanHistory: [],
                        missedPayments: 0,
                        lastPaymentDate: new Date().toISOString(),
                    });
                    alert('Admin account created and logged in.');
                } else {
                    throw loginError; // Re-throw other Firebase errors
                }
            }

            // After successful sign-in (or creation), verify admin status from Firestore
            if (adminUser) {
                const adminDocRef = doc(db, `artifacts/${appId}/users`, adminUser.uid);
                const adminDocSnap = await getDoc(adminDocRef);
                if (adminDocSnap.exists() && adminDocSnap.data().isAdmin) {
                    setUserProfile(adminDocSnap.data());
                    setIsLoggedIn(true);
                    setIsAdminLoggedIn(true);
                    setCurrentView('admin-dashboard'); // Navigate to admin dashboard
                } else {
                    alert('Admin profile not found or not marked as admin. Please ensure correct credentials and admin role.');
                    await signOut(auth); // Sign out if not a valid admin profile
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

                {/* Toggle buttons for Register, Login, Admin Login */}
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

                {/* Conditional rendering of login/registration forms */}
                {isAdminLogin ? (
                    // Admin Login Form
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
                    // User Registration Form
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
                    // User Login Form
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
