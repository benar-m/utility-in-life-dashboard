import { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * AuthContext
 * -----------
 * Minimal authentication/authorization stub for the MVP.
 *
 * SECURITY NOTE (read before wiring up a real backend):
 * - This stub stores the session in localStorage purely so the UI has
 *   something to read on refresh during development/demo.
 * - In production, do NOT store access tokens in localStorage/sessionStorage
 *   (they are readable by any script on the page, i.e. vulnerable to XSS).
 *   Prefer a short-lived access token kept in memory + a refresh token in an
 *   httpOnly, Secure, SameSite=strict cookie issued by your API.
 * - Every write endpoint (payments, attendance, student records) must be
 *   authorized server-side by role — this client-side role check only
 *   controls what the UI *shows*, it is not a security boundary by itself.
 * - `signIn`/`register` below deliberately never receive or store a
 *   password. The login/register forms collect one (for realistic UX
 *   and to validate its format), but it is only ever used locally to
 *   call a future `POST /auth/login` or `POST /auth/register` endpoint —
 *   never persist a password in state, localStorage, or anywhere else
 *   on the client.
 */

const AuthContext = createContext(null);

const SESSION_STORAGE_KEY = "uil.session"; // demo-only, see note above

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
      // Corrupted or inaccessible storage should never crash the app.
      console.warn("Could not restore session:", error);
    } finally {
      setIsCheckingSession(false);
    }
  }, []);

  /**
   * DEMO ONLY: accepts whatever the login form collected and treats it as
   * an authenticated session. Replace the body of this function with a
   * real call to your backend, e.g.:
   *
   *   const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/login`, {
   *     method: "POST",
   *     headers: { "Content-Type": "application/json" },
   *     body: JSON.stringify({ email, password }),
   *   });
   *   if (!response.ok) throw new Error("Invalid email or password");
   *   const { user } = await response.json();
   *   setCurrentUser(user);
   */
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
