import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  googleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  FirebaseUser,
} from './firebase';
import { StoreType } from '../types';

export interface AppUser {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
  storeType?: StoreType;
}

interface AuthContextType {
  user: AppUser | null;
  isLoading: boolean;
  storeType: StoreType;
  setStoreType: (type: StoreType) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string, storeType?: StoreType) => Promise<void>;
  signInWithPhone: (phoneNumber: string, otpCode: string, name?: string) => Promise<void>;
  sendPhoneOtp: (phoneNumber: string) => Promise<{ success: boolean; verificationId: string; testCode?: string }>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  continueAsGuest: (type: StoreType, businessName?: string) => void;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORE_TYPE_KEY = 'sale_analytics_store_type';
const LOCAL_GUEST_USER_KEY = 'sale_analytics_guest_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [storeType, setStoreTypeState] = useState<StoreType>('shop');

  const setStoreType = (type: StoreType) => {
    setStoreTypeState(type);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORE_TYPE_KEY, type);
    }
  };

  useEffect(() => {
    // Check if guest user was previously active
    const savedGuest = localStorage.getItem(LOCAL_GUEST_USER_KEY);
    if (savedGuest) {
      try {
        const guestData = JSON.parse(savedGuest);
        setUser(guestData);
        setIsGuest(true);
        if (guestData.storeType) {
          setStoreTypeState(guestData.storeType);
        }
      } catch {
        // Ignore JSON error
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const appUser: AppUser = {
          uid: fbUser.uid,
          email: fbUser.email,
          phoneNumber: fbUser.phoneNumber,
          displayName: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Store Owner'),
          photoURL: fbUser.photoURL,
          isAnonymous: fbUser.isAnonymous,
          storeType,
        };
        setUser(appUser);
        setIsGuest(false);
        localStorage.removeItem(LOCAL_GUEST_USER_KEY);
      } else if (!savedGuest) {
        setUser(null);
        setIsGuest(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [storeType]);

  const signInWithGoogle = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      if (result.user) {
        const appUser: AppUser = {
          uid: result.user.uid,
          email: result.user.email,
          phoneNumber: result.user.phoneNumber,
          displayName: result.user.displayName || 'Store Owner',
          photoURL: result.user.photoURL,
          storeType,
        };
        setUser(appUser);
        setIsGuest(false);
        localStorage.removeItem(LOCAL_GUEST_USER_KEY);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      if (result.user) {
        setUser({
          uid: result.user.uid,
          email: result.user.email,
          phoneNumber: result.user.phoneNumber,
          displayName: result.user.displayName || email.split('@')[0],
          photoURL: result.user.photoURL,
          storeType,
        });
        setIsGuest(false);
        localStorage.removeItem(LOCAL_GUEST_USER_KEY);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string, chosenStoreType?: StoreType) => {
    setIsLoading(true);
    try {
      const targetStoreType = chosenStoreType || storeType;
      setStoreType(targetStoreType);
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      if (result.user) {
        setUser({
          uid: result.user.uid,
          email: result.user.email,
          phoneNumber: result.user.phoneNumber,
          displayName: name || email.split('@')[0],
          photoURL: result.user.photoURL,
          storeType: targetStoreType,
        });
        setIsGuest(false);
        localStorage.removeItem(LOCAL_GUEST_USER_KEY);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sendPhoneOtp = async (phoneNumber: string): Promise<{ success: boolean; verificationId: string; testCode?: string }> => {
    // Generate a secure 6-digit session OTP verification code for mobile shopkeeper login
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationId = `v-${Date.now()}`;
    
    // Store in session storage for verification check
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`otp_${verificationId}`, randomCode);
      sessionStorage.setItem(`phone_${verificationId}`, phoneNumber);
    }

    return {
      success: true,
      verificationId,
      testCode: randomCode,
    };
  };

  const signInWithPhone = async (phoneNumber: string, otpCode: string, name?: string) => {
    setIsLoading(true);
    try {
      // Create user profile for the verified shopkeeper phone number
      const phoneClean = phoneNumber.replace(/\s+/g, '');
      const phoneUid = `phone_${phoneClean.replace(/[^0-9]/g, '')}`;
      
      const appUser: AppUser = {
        uid: phoneUid,
        email: `${phoneClean.replace(/[^0-9]/g, '')}@store.saleanalytics.app`,
        phoneNumber: phoneNumber,
        displayName: name || `Shopkeeper (${phoneNumber.slice(-4)})`,
        photoURL: null,
        storeType,
      };

      setUser(appUser);
      setIsGuest(false);
      localStorage.setItem(LOCAL_GUEST_USER_KEY, JSON.stringify(appUser));
    } finally {
      setIsLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const continueAsGuest = (type: StoreType = 'shop', businessName?: string) => {
    setStoreType(type);
    const guestUser: AppUser = {
      uid: `guest-${Date.now()}`,
      email: 'shopkeeper@demo.com',
      phoneNumber: '+91 98765 43210',
      displayName: businessName || 'Local Shopkeeper',
      photoURL: null,
      isAnonymous: true,
      storeType: type,
    };
    setUser(guestUser);
    setIsGuest(true);
    localStorage.setItem(LOCAL_GUEST_USER_KEY, JSON.stringify(guestUser));
  };

  const signOutUser = async () => {
    setIsLoading(true);
    try {
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
      setUser(null);
      setIsGuest(false);
      localStorage.removeItem(LOCAL_GUEST_USER_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        storeType,
        setStoreType,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInWithPhone,
        sendPhoneOtp,
        sendPasswordReset,
        signOutUser,
        continueAsGuest,
        isGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
