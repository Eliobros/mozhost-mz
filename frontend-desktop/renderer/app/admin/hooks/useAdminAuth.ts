// admin/hooks/useAdminAuth.ts
import { useState } from 'react';

export const useAdminAuth = () => {
  const [password, setPassword] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = (pwd: string) => {
    setPassword(pwd);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setPassword('');
    setIsAuthenticated(false);
  };

  return {
    password,
    isAuthenticated,
    login,
    logout
  };
};
