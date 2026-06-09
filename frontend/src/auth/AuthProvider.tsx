import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import {
  clearStoredAuth,
  getCurrentUser,
  hasStoredAuth,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  type AuthUser
} from "../api/agenthubApi";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  authenticated: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  register: (username: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!hasStoredAuth()) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      try {
        const currentUser = await getCurrentUser();
        if (!cancelled) {
          setUser(currentUser);
        }
      } catch {
        clearStoredAuth();
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleAuthCleared() {
      setUser(null);
      setLoading(false);
    }
    window.addEventListener("agenthub:auth-cleared", handleAuthCleared);
    return () => {
      window.removeEventListener("agenthub:auth-cleared", handleAuthCleared);
    };
  }, []);

  async function login(username: string, password: string) {
    const result = await loginRequest(username, password);
    setUser(result.user);
    return result.user;
  }

  async function register(username: string, email: string, password: string) {
    const result = await registerRequest(username, email, password);
    setUser(result.user);
    return result.user;
  }

  async function logout() {
    await logoutRequest();
    setUser(null);
  }

  async function refreshUser() {
    if (!hasStoredAuth()) {
      setUser(null);
      return null;
    }
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch {
      clearStoredAuth();
      setUser(null);
      return null;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authenticated: Boolean(user),
        login,
        register,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
