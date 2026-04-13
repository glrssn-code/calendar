'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { StickyNote, NewStickyNote } from '@/types/stickyNote';
import { stickyNoteDB } from '@/lib/db';
import { backupNotesToLocal, restoreNotesFromLocal } from '@/lib/autoBackup';

interface StickyNoteContextType {
  notes: StickyNote[];
  addNote: (note: NewStickyNote) => StickyNote;
  updateNote: (note: StickyNote) => void;
  deleteNote: (id: string) => void;
  reorderNotes: (notes: StickyNote[]) => void;
  reloadNotes: () => Promise<void>;
  setReminder: (id: string, date: string, time: string) => void;
  clearReminder: (id: string) => void;
  toggleComplete: (id: string) => void;
  addLinkedEvent: (noteId: string, eventId: string) => void;
  removeLinkedEvent: (noteId: string, eventId: string) => void;
  getNoteById: (id: string) => StickyNote | undefined;
}

const StickyNoteContext = createContext<StickyNoteContextType | null>(null);

export function StickyNoteProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 加载便签
  useEffect(() => {
    const loadNotes = async () => {
      try {
        let loaded = await stickyNoteDB.getAll();

        // 如果 IndexedDB 为空，检查 localStorage 自动备份
        if (loaded.length === 0) {
          const localNotes = restoreNotesFromLocal();
          if (localNotes.length > 0) {
            console.log('Found local backup for notes, restoring...');
            for (const note of localNotes) {
              await stickyNoteDB.add(note);
            }
            loaded = localNotes;
          }
        }

        // 确保所有便签都有 linkedEventIds 字段
        const sortedNotes = loaded.sort((a, b) => a.order - b.order).map(normalizeNote);
        setNotes(sortedNotes);
        setIsLoaded(true);

        // 备份到 localStorage
        if (sortedNotes.length > 0) {
          backupNotesToLocal(sortedNotes);
        }
      } catch (err) {
        console.error('Failed to load sticky notes:', err);
        setNotes([]);
        setIsLoaded(true);
      }
    };

    loadNotes();
  }, []);

  // 确保便签有 linkedEventIds 字段
  const normalizeNote = (note: StickyNote): StickyNote => ({
    ...note,
    linkedEventIds: note.linkedEventIds || [],
  });

  const addNote = useCallback((noteData: NewStickyNote): StickyNote => {
    const maxOrder = notes.length > 0 ? Math.max(...notes.map(n => n.order)) : -1;
    const newNote: StickyNote = {
      ...noteData,
      id: crypto.randomUUID(),
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
      linkedEventIds: [], // 初始化为空数组
    };
    // 保存到 IndexedDB
    stickyNoteDB.add(newNote).catch(err => console.error('Failed to add sticky note:', err));
    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
    // 备份到 localStorage
    backupNotesToLocal(updatedNotes);
    return newNote;
  }, [notes]);

  const updateNote = useCallback((note: StickyNote) => {
    // 更新 IndexedDB
    stickyNoteDB.put(note).catch(err => console.error('Failed to update sticky note:', err));
    const updatedNotes = notes.map(n => n.id === note.id ? note : n);
    setNotes(updatedNotes);
    // 备份到 localStorage
    backupNotesToLocal(updatedNotes);
  }, [notes]);

  const deleteNote = useCallback((id: string) => {
    // 从 IndexedDB 删除
    stickyNoteDB.delete(id).catch(err => console.error('Failed to delete sticky note:', err));
    const updatedNotes = notes.filter(n => n.id !== id);
    setNotes(updatedNotes);
    // 备份到 localStorage
    backupNotesToLocal(updatedNotes);
  }, [notes]);

  const reorderNotes = useCallback((reorderedNotes: StickyNote[]) => {
    const updated = reorderedNotes.map((note, index) => ({ ...note, order: index }));
    // 批量更新到 IndexedDB
    stickyNoteDB.bulkPut(updated).catch(err => console.error('Failed to reorder sticky notes:', err));
    setNotes(updated);
    // 备份到 localStorage
    backupNotesToLocal(updated);
  }, []);

  const reloadNotes = useCallback(async () => {
    const loaded = await stickyNoteDB.getAll();
    setNotes(loaded.sort((a, b) => a.order - b.order).map(normalizeNote));
  }, []);

  const setReminder = useCallback((id: string, date: string, time: string) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      const updated = { ...note, reminderDate: date, reminderTime: time };
      stickyNoteDB.put(updated).catch(err => console.error('Failed to update sticky note reminder:', err));
      setNotes(prev => prev.map(n => n.id === id ? updated : n));
    }
  }, [notes]);

  const clearReminder = useCallback((id: string) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      const updated = { ...note, reminderDate: undefined, reminderTime: undefined };
      stickyNoteDB.put(updated).catch(err => console.error('Failed to clear sticky note reminder:', err));
      setNotes(prev => prev.map(n => n.id === id ? updated : n));
    }
  }, [notes]);

  const toggleComplete = useCallback((id: string) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      const updated = { ...note, completed: !note.completed };
      stickyNoteDB.put(updated).catch(err => console.error('Failed to toggle sticky note complete:', err));
      setNotes(prev => prev.map(n => n.id === id ? updated : n));
    }
  }, [notes]);

  const addLinkedEvent = useCallback((noteId: string, eventId: string) => {
    const note = notes.find(n => n.id === noteId);
    const linkedIds = note?.linkedEventIds || [];
    if (note && !linkedIds.includes(eventId)) {
      const updated = { ...note, linkedEventIds: [...linkedIds, eventId] };
      stickyNoteDB.put(updated).catch(err => console.error('Failed to add linked event:', err));
      setNotes(prev => prev.map(n => n.id === noteId ? updated : n));
    }
  }, [notes]);

  const removeLinkedEvent = useCallback((noteId: string, eventId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      const linkedIds = note.linkedEventIds || [];
      const updated = { ...note, linkedEventIds: linkedIds.filter(id => id !== eventId) };
      stickyNoteDB.put(updated).catch(err => console.error('Failed to remove linked event:', err));
      setNotes(prev => prev.map(n => n.id === noteId ? updated : n));
    }
  }, [notes]);

  const getNoteById = useCallback((id: string) => {
    return notes.find(n => n.id === id);
  }, [notes]);

  return (
    <StickyNoteContext.Provider
      value={{
        notes,
        addNote,
        updateNote,
        deleteNote,
        reorderNotes,
        reloadNotes,
        setReminder,
        clearReminder,
        toggleComplete,
        addLinkedEvent,
        removeLinkedEvent,
        getNoteById,
      }}
    >
      {children}
    </StickyNoteContext.Provider>
  );
}

export function useStickyNotes() {
  const context = useContext(StickyNoteContext);
  if (!context) {
    throw new Error('useStickyNotes must be used within a StickyNoteProvider');
  }
  return context;
}
