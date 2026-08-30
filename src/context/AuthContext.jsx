import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

const SESSION_STORAGE_KEY = "uil.session"; // demo-only

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    try {
      const storedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (storedSession) {
        setCurrentUser(JSON.parse(storedSession));
      }
    } catch (error) {
      // Corrupted or inaccessible storage should not crash the app.
      console.warn("Could not restore session:", error);
    } finally {
      setIsCheckingSession(false);
    }
  }, []);

  
  const signIn = ({ fullName, email, role }) => {
    const nextUser = { fullName, email, role };
    setCurrentUser(nextUser);
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextUser));
  };

  /**
   * DEMO ONLY: same caveat as signIn — wire this to
   * POST /auth/register once a backend exists. The real endpoint is
   * responsible for hashing the password (e.g. bcrypt/argon2), enforcing
   * uniqueness of the email, and rejecting weak passwords server-side —
   * never trust the client-side checks in RegisterPage.jsx alone.
   */
  const register = ({ fullName, email, role }) => {
    signIn({ fullName, email, role });
  };

  const signOut = () => {
    setCurrentUser(null);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const value = useMemo(
    () => ({ currentUser, isCheckingSession, signIn, register, signOut }),
    [currentUser, isCheckingSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
