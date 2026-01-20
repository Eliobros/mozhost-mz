// admin/utils/api.ts
const API_BASE = 'https://api.mozhost.topaziocoin.online/api/admin';

export const adminAPI = {
  // Stats
  async fetchStats(password: string) {
    const res = await fetch(`${API_BASE}/stats?password=${encodeURIComponent(password)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao buscar estatísticas');
    return data;
  },

  // Users
  async fetchUsers(password: string, filters?: {
    search?: string;
    plan?: string;
    verified?: string;
  }) {
    let url = `${API_BASE}/users?password=${encodeURIComponent(password)}`;
    if (filters?.search) url += `&search=${filters.search}`;
    if (filters?.plan) url += `&plan=${filters.plan}`;
    if (filters?.verified) url += `&verified=${filters.verified}`;

    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao buscar usuários');
    return data.users;
  },

  // Containers
  async fetchContainers(password: string, status?: string) {
    let url = `${API_BASE}/containers?password=${encodeURIComponent(password)}`;
    if (status) url += `&status=${status}`;

    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao buscar containers');
    return data.containers;
  },

  // Coins
  async addCoins(formData: { username: string; amount: string; password: string }) {
    const res = await fetch(`${API_BASE}/coins/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao adicionar coins');
    return data;
  },

  async removeCoins(formData: { username: string; amount: string; password: string }) {
    const res = await fetch(`${API_BASE}/coins/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Erro ao remover coins');
    return data;
  },

  // Update user
  async updatePlan(userId: number, plan: string, password: string) {
    const res = await fetch(`${API_BASE}/users/${userId}/plan`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao atualizar plano');
    return data;
  },

  async toggleStatus(userId: number, isActive: boolean, password: string) {
    const res = await fetch(`${API_BASE}/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao atualizar status');
    return data;
  }
};
