import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { User } from "@workspace/api-client-react";
import { getMe, setAuthTokenGetter } from "@workspace/api-client-react";

// Setup global token getter for customFetch
setAuthTokenGetter(() => localStorage.getItem("affitrack_token"));

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("affitrack_token"));
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const u = await getMe();
        setUser(u);
      } catch (e) {
        localStorage.removeItem("affitrack_token");
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("affitrack_token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("affitrack_token");
    setToken(null);
    setUser(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
