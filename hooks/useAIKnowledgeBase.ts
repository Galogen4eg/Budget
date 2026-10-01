import { useState, useCallback } from 'react';
import { AIKnowledgeItem } from '../types';
import { toast } from 'sonner';

export interface UseAIKnowledgeBaseInput {
  aiKnowledge: AIKnowledgeItem[];
  addAIKnowledge: (text: string) => Promise<void>;
  deleteAIKnowledge: (id: string) => Promise<void>;
}

export interface UseAIKnowledgeBaseOutput {
  knowledgeItems: AIKnowledgeItem[];
  newFactText: string;
  setNewFactText: (text: string) => void;
  handleAddFact: () => Promise<void>;
  handleDeleteFact: (id: string) => Promise<void>;
  isValid: boolean;
}

/**
 * Custom hook to encapsulate the logic for managing the AI knowledge base (adding/deleting facts).
 */
export function useAIKnowledgeBase({
  aiKnowledge,
  addAIKnowledge,
  deleteAIKnowledge,
}: UseAIKnowledgeBaseInput): UseAIKnowledgeBaseOutput {
  const [newFactText, setNewFactText] = useState('');

  const handleAddFact = useCallback(async () => {
    const trimmed = newFactText.trim();
    if (!trimmed) {
      toast.warning('Текст факта не может быть пустым');
      return;
    }
    try {
      await addAIKnowledge(trimmed);
      setNewFactText('');
      toast.success('Факт успешно добавлен в базу знаний ИИ');
    } catch (err) {
      console.error('Failed to add AI knowledge', err);
      toast.error('Не удалось сохранить факт');
    }
  }, [newFactText, addAIKnowledge]);

  const handleDeleteFact = useCallback(async (id: string) => {
    try {
      await deleteAIKnowledge(id);
      toast.success('Факт удален из базы знаний');
    } catch (err) {
      console.error('Failed to delete AI knowledge', err);
      toast.error('Не удалось удалить факт');
    }
  }, [deleteAIKnowledge]);

  const isValid = newFactText.trim().length > 0;

  return {
    knowledgeItems: aiKnowledge,
    newFactText,
    setNewFactText,
    handleAddFact,
    handleDeleteFact,
    isValid,
  };
}

export default useAIKnowledgeBase;
