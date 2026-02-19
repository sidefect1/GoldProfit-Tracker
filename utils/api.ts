import { ProjectSettings, Store } from '../types';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import imageCompression from 'browser-image-compression';

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
   * Returns the public URL string or throws an Error.
   */
  async uploadProjectImage(file: File, projectId: string): Promise<string> {
    try {
      const BUCKET_NAME = 'product_images'; // EXACT MATCH for bucket name
      
      const options = { 
        maxSizeMB: 0.2, 
        maxWidthOrHeight: 1000, 
        useWebWorker: true,
        fileType: 'image/webp'
      };
      const compressedFile = await imageCompression(file, options);

      const fileName = `${projectId}/${crypto.randomUUID()}.webp`;
      const filePath = `${fileName}`;

      // 1. Upload to the correct bucket
      const { data, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, compressedFile, {
            cacheControl: '31536000',
            contentType: 'image/webp',
            upsert: false
        });

      if (uploadError) {
        console.error("Supabase Upload Error Detailed:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      if (!data?.path) {
         throw new Error("Upload appeared successful but returned no path.");
      }

      // 2. Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path); // Use the path returned from upload

      if (!publicUrlData || !publicUrlData.publicUrl) {
          throw new Error("Could not generate public URL.");
      }

      console.log("Image uploaded successfully:", publicUrlData.publicUrl);
      return publicUrlData.publicUrl;

    } catch (error) {
      console.error("Catch Block Error:", error);
      throw error;
    }
  },

  /**
   * Fetch live gold price (Mock implementation for demo purposes)
   */
  async getLiveGoldPrice(): Promise<{ price: number; error?: string }> {
      try {
          // Simulate network request
          await new Promise(resolve => setTimeout(resolve, 600));
          
          // Return a mock live price (e.g. slight variance from 85)
          const basePrice = 85.00;
          const variance = (Math.random() * 2) - 1; // +/- 1 dollar
          const livePrice = parseFloat((basePrice + variance).toFixed(2));
          
          return { price: livePrice };
      } catch (e: any) {
          console.error("Failed to fetch live gold price", e);
          return { price: 0, error: e.message || "Unknown error" };
      }
  }
};
