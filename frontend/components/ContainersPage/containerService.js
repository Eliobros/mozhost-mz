const API_BASE_URL = 'https://api.mozhost.shop/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('mozhost_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const loadContainers = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/containers`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Falha ao carregar containers');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao carregar containers:', error);
    throw error;
  }
};

export const upgradeStorage = async (containerId, addMb) => {
  try {
    const response = await fetch(`${API_BASE_URL}/containers/${containerId}/upgrade-storage`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ addMb })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Falha no upgrade');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao fazer upgrade de storage:', error);
    throw error;
  }
};

export const performContainerAction = async (containerId, action) => {
  try {
    const response = await fetch(`${API_BASE_URL}/containers/${containerId}/${action}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Falha na operação');
    }

    return await response.json();
  } catch (error) {
    console.error(`Erro ao executar ${action}:`, error);
    throw error;
  }
};

export const createContainer = async (containerData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/containers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(containerData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Falha ao criar container');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao criar container:', error);
    throw error;
  }
};

export const deleteContainer = async (containerId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/containers/${containerId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Falha ao deletar');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao deletar container:', error);
    throw error;
  }
};
