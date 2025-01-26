import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import type { BaseTag } from '@/types/tags';

interface UseBaseTagsTableProps {
  tableName: 'products_tags' | 'inventory_tags';
  queryKey: string[];
}

export const useBaseTagsTable = ({ tableName, queryKey }: UseBaseTagsTableProps) => {
  const queryClient = useQueryClient();
  const relationshipTable = `${tableName}_relationship`;

  // Helper to check if tag is in use
  const checkTagInUse = async (tagId: number) => {
    const { count, error } = await supabase
      .from(relationshipTable)
      .select('*', { count: 'exact', head: true })
      .eq('tag_id', tagId);

    if (error) throw error;
    return count ? count > 0 : false;
  };

  // Create mutation
  const createTagMutation = useMutation({
    mutationFn: async (newTag: Omit<BaseTag, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from(tableName)
        .insert({
          ...newTag,
          tag_values: newTag.tag_type === 'set' ? newTag.tag_values : null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  // Update mutation
  const updateTagMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number, updates: Partial<Omit<BaseTag, 'id' | 'created_at'>> }) => {
      // If updating tag_type, ensure tag_values are consistent
      const finalUpdates = { ...updates };
      if ('tag_type' in updates) {
        if (updates.tag_type === 'boolean' || updates.tag_type === 'text') {
          finalUpdates.tag_values = null;
        } else if (updates.tag_type === 'set') {
          // Set type can have values
          if (!finalUpdates.tag_values) {
            finalUpdates.tag_values = [];
          }
        }
      }

      // Clean up any undefined or empty array values
      Object.keys(finalUpdates).forEach(key => {
        const k = key as keyof typeof finalUpdates;
        if (finalUpdates[k] === undefined) {
          delete finalUpdates[k];
        }
        // Convert empty arrays to null for array fields
        if (Array.isArray(finalUpdates[k])) {
          if (finalUpdates[k].length === 0) {
            (finalUpdates as any)[k] = null;
          }
        }
      });

      console.log('Updating tag with data:', { id, updates: finalUpdates });

      try {
        const { data, error } = await supabase
          .from(tableName)
          .update(finalUpdates)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Supabase update error:', error);
          throw new Error(`Failed to update tag: ${error.message}`);
        }

        return data;
      } catch (error) {
        console.error('Update error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  // Delete mutation
  const deleteTagMutation = useMutation({
    mutationFn: async (id: number) => {
      // Check if tag is in use
      const inUse = await checkTagInUse(id);
      if (inUse) {
        throw new Error('Cannot delete tag that is in use');
      }

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  // Update display order mutation
  const updateDisplayOrderMutation = useMutation({
    mutationFn: async ({ id, order }: { id: number, order: number | null }) => {
      const { data, error } = await supabase
        .from(tableName)
        .update({ 
          tags_display_in_table_order: order,
          tags_display_in_table: order !== null 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  return {
    createTag: createTagMutation.mutate,
    updateTag: updateTagMutation.mutate,
    deleteTag: deleteTagMutation.mutate,
    updateDisplayOrder: updateDisplayOrderMutation.mutate,
    isCreating: createTagMutation.isPending,
    isUpdating: updateTagMutation.isPending,
    isDeleting: deleteTagMutation.isPending,
    isUpdatingOrder: updateDisplayOrderMutation.isPending,
    error: updateTagMutation.error
  };
}; 