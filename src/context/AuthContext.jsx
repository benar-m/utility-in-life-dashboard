import { createContext, useContext, useEffect, useMemo, useState } from "react";

  //AuthContext
 // Minimal authentication/authorization for the MVP.
 
//back end should be implemented with security context in mind to prevent xss
 //This stores the session in localStorage so the UI has


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

  const signIn = ({ fullName, role }) => {
    const nextUser = { fullName, role };
    setCurrentUser(nextUser);
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextUser));
  };

  const signOut = () => {
    setCurrentUser(null);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const value = useMemo(
    () => ({ currentUser, isCheckingSession, signIn, signOut }),
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
