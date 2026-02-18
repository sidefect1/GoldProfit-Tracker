
import { ProjectSettings, Store } from '../types';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';

export const api = {
  isBackendAvailable: false,

  /**
   * Check if backend is reachable (lightweight query)
   */
  async checkStatus(): Promise<boolean> {
    try {
      const { error } = await supabase.from('stores').select('id').limit(1);
      if (error) throw error;
      this.isBackendAvailable = true;
      return true;
    } catch (e) {
      console.warn("Supabase connection check failed:", e);
      this.isBackendAvailable = false;
      return false;
    }
  },

  /**
   * Fetch all stores from Supabase
   */
  async getStores(): Promise<Store[]> {
    if (!this.isBackendAvailable) {
      const saved = localStorage.getItem('gold-profit-stores');
      return saved ? JSON.parse(saved) : [];
    }

    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, updated_at, last_editor_name, last_editor_id, content');

      if (error) throw error;

      if (data) {
        const stores = data.map((row: any) => ({
          ...row.content,
          id: row.id, // Ensure ID comes from DB row
          dbUpdatedAt: new Date(row.updated_at).getTime(),
          lastEditorName: row.last_editor_name,
          lastEditorId: row.last_editor_id,
        } as Store));
        
        // Update Local Cache
        localStorage.setItem('gold-profit-stores', JSON.stringify(stores));
        return stores;
      }
      return [];
    } catch (e) {
      console.error("Failed to fetch stores", e);
      return [];
    }
  },

  /**
   * Fetch all projects from Supabase
   */
  async getProjects(): Promise<ProjectSettings[]> {
    if (!this.isBackendAvailable) {
      const saved = localStorage.getItem('gold-profit-projects-v2');
      return saved ? JSON.parse(saved) : [];
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, store_id, updated_at, last_editor_name, last_editor_id, content');

      if (error) throw error;

      if (data) {
        const projects = data.map((row: any) => ({
          ...row.content,
          id: row.id, // Ensure ID comes from DB row
          storeId: row.store_id,
          dbUpdatedAt: new Date(row.updated_at).getTime(),
          lastEditorName: row.last_editor_name,
          lastEditorId: row.last_editor_id,
        } as ProjectSettings));

        // Update Local Cache
        localStorage.setItem('gold-profit-projects-v2', JSON.stringify(projects));
        return projects;
      }
      return [];
    } catch (e) {
      console.error("Failed to fetch projects", e);
      return [];
    }
  },

  /**
   * Save (Upsert) a single Store
   */
  async saveStore(store: Store, session: Session): Promise<void> {
    if (!this.isBackendAvailable) return;

    const lastEditorName = session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'Unknown';
    const lastEditorId = session.user.id;
    const now = Date.now();

    const payload = {
      id: store.id,
      updated_at: now,
      content: store,
      last_editor_name: lastEditorName,
      last_editor_id: lastEditorId
    };

    const { error } = await supabase
      .from('stores')
      .upsert(payload, { onConflict: 'id' });

    if (error) throw error;
  },

  /**
   * Save (Upsert) a single Project
   */
  async saveProject(project: ProjectSettings, session: Session): Promise<void> {
    if (!this.isBackendAvailable) return;

    const lastEditorName = session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'Unknown';
    const lastEditorId = session.user.id;
    const now = Date.now();

    const payload = {
      id: project.id,
      store_id: project.storeId,
      updated_at: now,
      content: project,
      last_editor_name: lastEditorName,
      last_editor_id: lastEditorId
    };

    const { error } = await supabase
      .from('projects')
      .upsert(payload, { onConflict: 'id' });

    if (error) throw error;
  },

  /**
   * Delete a single Store
   */
  async deleteStore(storeId: string): Promise<void> {
    if (!this.isBackendAvailable) throw new Error("Backend unavailable");
    const { error } = await supabase.from('stores').delete().eq('id', storeId);
    if (error) throw error;
  },

  /**
   * Delete a single Project
   */
  async deleteProject(projectId: string): Promise<void> {
    if (!this.isBackendAvailable) throw new Error("Backend unavailable");
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
  },

  /**
   * Upload Project Image to Storage
   */
  async uploadProjectImage(file: File, projectId: string): Promise<string | null> {
    // Attempt upload regardless of isBackendAvailable flag, as that check relies on DB table access
    // which might differ from Storage permissions.

    try {
      const fileExt = file.name.split('.').pop();
      // Ensure unique filename every time to bust cache
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-images')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

      if (uploadError) {
        console.error('Supabase Upload Error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('project-images')
        .getPublicUrl(filePath);

      console.log("Image uploaded successfully:", publicUrl);
      return publicUrl;
    } catch (e) {
      console.error("Failed to upload image logic:", e);
      return null;
    }
  }
};
