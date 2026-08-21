import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setToken, removeToken, getToken } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

type User = {
  id: number;
  username: string;
  email: string;
  plan: string;
  maxContainers: number;
  coins: number;
  emailVerified: boolean;
  whatsappVerified: boolean;
  smsVerified: boolean;
  preferredVerificationMethod: string;
  phone?: string;
  countryCode?: string;
  maxRamMb?: number;
  maxStorageMb?: number;
};

type AccountStatus = {
  suspended: boolean;
  suspension_reason?: string | null;
  suspended_at?: string | null;
  plan?: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accountStatus: AccountStatus | null;
  refreshAccountStatus: () => Promise<void>;
  login: (loginStr: string, password: string) => Promise<{ needsVerification?: boolean; method?: string }>;
  register: (data: any) => Promise<{ needsVerification?: boolean; method?: string }>;
  verifyCode: (code: string, method: string) => Promise<any>;
  resendCode: (method: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Define o usuário no contexto (usado no fluxo OAuth, onde os dados já vieram da API) */
  setAuthUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const data = await api.verifyToken();
      setUser(data.user);
      await refreshAccountStatus().catch(() => {});
    } catch {
      await removeToken();
      await AsyncStorage.removeItem('mozhost_user');
    } finally {
      setIsLoading(false);
    }
  };

  // Busca o status da conta (suspensa por trial expirado / plano sem renovação)
  const refreshAccountStatus = async () => {
    try {
      const data = await api.getAccountStatus();
      const current = data?.current;
      setAccountStatus({
        suspended: !!current?.suspended,
        suspension_reason: current?.suspension_reason || null,
        suspended_at: current?.suspended_at || null,
        plan: current?.plan,
      });
    } catch {
      setAccountStatus({ suspended: false });
    }
  };

  const login = async (loginStr: string, password: string) => {
    const data = await api.login(loginStr, password);
    await setToken(data.token);
    await AsyncStorage.setItem('mozhost_user', JSON.stringify(data.user));
    setUser(data.user);
    await refreshAccountStatus().catch(() => {});
    return {};
  };

  const register = async (userData: any) => {
    const data = await api.register(userData);
    await setToken(data.token);
    await AsyncStorage.setItem('mozhost_user', JSON.stringify(data.user));

    const u = data.user;
    const needsVerification = u.emailVerified === false || u.whatsappVerified === false || u.smsVerified === false;

    if (needsVerification) {
      setUser(u);
      return { needsVerification: true, method: u.preferredVerificationMethod || 'email' };
    }

    setUser(u);
    return {};
  };

  const verifyCode = async (code: string, method: string) => {
    const data = await api.verifyCode(code, method);
    await refreshUser();
    return data;
  };

  const resendCode = async (method: string) => {
    await api.resendCode(method);
  };

  const logout = async () => {
    await removeToken();
    await AsyncStorage.removeItem('mozhost_user');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const data = await api.verifyToken();
      setUser(data.user);
      await AsyncStorage.setItem('mozhost_user', JSON.stringify(data.user));
    } catch {
      // ignore
    }
  };

  // Sincroniza o estado com um usuário que já veio da API (sem nova chamada de rede),
  // para que isAuthenticated fique true e o guard de rota deixe o usuário entrar.
  const setAuthUser = (user: User) => {
    setUser(user);
    AsyncStorage.setItem('mozhost_user', JSON.stringify(user)).catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        accountStatus,
        refreshAccountStatus,
        login,
        register,
        verifyCode,
        resendCode,
        logout,
        refreshUser,
        setAuthUser,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
