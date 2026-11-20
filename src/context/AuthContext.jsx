import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { login, logout, refreshSession, registerStudent } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;
    refreshSession()
      .then((user) => {
        if (isMounted) setCurrentUser(user);
      })
      .catch(() => {
        if (isMounted) setCurrentUser(null);
      })
      .finally(() => {
        if (isMounted) setIsCheckingSession(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = async ({ email, password }) => {
    const user = await login(email, password);
    setCurrentUser(user);
    return user;
  };

  const signUp = async (details) => {
    const user = await registerStudent(details);
    setCurrentUser(user);
    return user;
  };

  const signOut = async () => {
    try {
      await logout();
    } finally {
      setCurrentUser(null);
    }
  };

  const value = useMemo(
    () => ({ currentUser, isCheckingSession, signIn, signUp, signOut }),
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
