'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LifeDiary, LifeNote, getDiaries, getNotes, addDiary, updateDiary, deleteDiary, addNote, updateNote, deleteNote, getDiariesByDate, getNotesByDate } from '@/lib/lifeStorage';
import { useUndo } from './UndoContext';

interface LifeCalendarState {
  diaries: LifeDiary[];
  notes: LifeNote[];
  isLoading: boolean;
}

interface LifeCalendarContextType extends LifeCalendarState {
  refreshData: () => Promise<void>;
  addDiary: (diary: Omit<LifeDiary, 'id' | 'createdAt' | 'updatedAt'>) => Promise<LifeDiary>;
  updateDiary: (id: string, updates: Partial<LifeDiary>) => Promise<void>;
  deleteDiary: (id: string) => Promise<void>;
  addNote: (note: Omit<LifeNote, 'id' | 'createdAt'>) => Promise<LifeNote>;
  updateNote: (id: string, updates: Partial<LifeNote>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  getDiariesByDate: (date: string) => Promise<LifeDiary[]>;
  getNotesByDate: (date: string) => Promise<LifeNote[]>;
}

const LifeCalendarContext = createContext<LifeCalendarContextType | null>(null);

export function LifeCalendarProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LifeCalendarState>({
    diaries: [],
    notes: [],
    isLoading: true,
  });

  const { pushAction } = useUndo();

  const refreshData = useCallback(async () => {
    try {
      const [diaries, notes] = await Promise.all([getDiaries(), getNotes()]);
      setState({ diaries, notes, isLoading: false });
    } catch (error) {
      console.error('Failed to load life calendar data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleAddDiary = useCallback(async (diary: Omit<LifeDiary, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newDiary = await addDiary(diary);
    setState(prev => ({
      ...prev,
      diaries: [...prev.diaries, newDiary],
    }));
    return newDiary;
  }, []);

  const handleUpdateDiary = useCallback(async (id: string, updates: Partial<LifeDiary>) => {
    await updateDiary(id, updates);
    setState(prev => ({
      ...prev,
      diaries: prev.diaries.map(d => d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d),
    }));
  }, []);

  const handleDeleteDiary = useCallback(async (id: string) => {
    const diaryToDelete = state.diaries.find(d => d.id === id);
    if (diaryToDelete) {
      pushAction({
        type: 'DELETE_DIARY',
        description: '删除日记',
        previousData: diaryToDelete,
        undo: async () => {
          await addDiary({
            date: diaryToDelete.date,
            content: diaryToDelete.content,
            mood: diaryToDelete.mood,
            weather: diaryToDelete.weather,
          });
          // 撤销后刷新数据以更新 UI
          await refreshData();
        },
      });
    }
    await deleteDiary(id);
    setState(prev => ({
      ...prev,
      diaries: prev.diaries.filter(d => d.id !== id),
    }));
  }, [state.diaries, pushAction, refreshData]);

  const handleAddNote = useCallback(async (note: Omit<LifeNote, 'id' | 'createdAt'>) => {
    const newNote = await addNote(note);
    setState(prev => ({
      ...prev,
      notes: [...prev.notes, newNote],
    }));
    return newNote;
  }, []);

  const handleUpdateNote = useCallback(async (id: string, updates: Partial<LifeNote>) => {
    await updateNote(id, updates);
    setState(prev => ({
      ...prev,
      notes: prev.notes.map(n => n.id === id ? { ...n, ...updates } : n),
    }));
  }, []);

  const handleDeleteNote = useCallback(async (id: string) => {
    const noteToDelete = state.notes.find(n => n.id === id);
    if (noteToDelete) {
      pushAction({
        type: 'DELETE_LIFE_NOTE',
        description: '删除便签',
        previousData: noteToDelete,
        undo: async () => {
          await addNote({
            title: noteToDelete.title,
            content: noteToDelete.content,
            color: noteToDelete.color,
            isUrgent: noteToDelete.isUrgent,
            completed: noteToDelete.completed,
            linkedDate: noteToDelete.linkedDate,
          });
          // 撤销后刷新数据以更新 UI
          await refreshData();
        },
      });
    }
    await deleteNote(id);
    setState(prev => ({
      ...prev,
      notes: prev.notes.filter(n => n.id !== id),
    }));
  }, [state.notes, pushAction, refreshData]);

  const handleGetDiariesByDate = useCallback(async (date: string) => {
    return getDiariesByDate(date);
  }, []);

  const handleGetNotesByDate = useCallback(async (date: string) => {
    return getNotesByDate(date);
  }, []);

  return (
    <LifeCalendarContext.Provider
      value={{
        ...state,
        refreshData,
        addDiary: handleAddDiary,
        updateDiary: handleUpdateDiary,
        deleteDiary: handleDeleteDiary,
        addNote: handleAddNote,
        updateNote: handleUpdateNote,
        deleteNote: handleDeleteNote,
        getDiariesByDate: handleGetDiariesByDate,
        getNotesByDate: handleGetNotesByDate,
      }}
    >
      {children}
    </LifeCalendarContext.Provider>
  );
}

export function useLifeCalendar() {
  const context = useContext(LifeCalendarContext);
  if (!context) {
    throw new Error('useLifeCalendar must be used within LifeCalendarProvider');
  }
  return context;
}
