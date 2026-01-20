import { contextBridge, ipcRenderer } from 'electron';

// Expõe APIs pro Next.js de forma segura
contextBridge.exposeInMainWorld('electron', {
  // Informações básicas
  platform: process.platform,
  
  // Notificações (implementar no background.ts)
  notify: (title: string, body: string) =>
    ipcRenderer.invoke('show-notification', { title, body }),
  
  // Storage local (implementar no background.ts)
  store: {
    get: (key: string) => ipcRenderer.invoke('store-get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('store-set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store-delete', key),
  },
  
  // Versão do app
  getVersion: () => ipcRenderer.invoke('get-version'),
});

// Type definitions pro TypeScript
export type ElectronAPI = {
  platform: string;
  notify: (title: string, body: string) => Promise<void>;
  store: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
  getVersion: () => Promise<string>;
};

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
