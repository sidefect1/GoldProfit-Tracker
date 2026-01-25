
import { ProjectSettings } from '../types';

const API_URL = 'http://localhost:3001/api';

export const api = {
  isBackendAvailable: false,

  /**
   * Check if backend is reachable
   */
  async checkStatus(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
      const res = await fetch(`${API_URL}/status`, { signal: controller.signal });
      clearTimeout(timeoutId);
      this.isBackendAvailable = res.ok;
      return res.ok;
    } catch (e) {
      this.isBackendAvailable = false;
      return false;
    }
  },

  /**
   * Fetch all projects from Backend, fallback to LocalStorage
   */
  async getProjects(): Promise<ProjectSettings[]> {
    if (this.isBackendAvailable) {
      try {
        const res = await fetch(`${API_URL}/projects`);
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {
        console.warn("Backend fetch failed, falling back to local storage");
      }
    }
    
    // Fallback
    const saved = localStorage.getItem('gold-profit-projects-v2');
    return saved ? JSON.parse(saved) : [];
  },

  /**
   * Save all projects to Backend, fallback to LocalStorage
   */
  async saveProjects(projects: ProjectSettings[]): Promise<void> {
    // Always save to LocalStorage as a backup/cache
    localStorage.setItem('gold-profit-projects-v2', JSON.stringify(projects));

    if (this.isBackendAvailable) {
      try {
        await fetch(`${API_URL}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projects),
        });
      } catch (e) {
        console.error("Failed to sync with backend");
      }
    }
  }
};
