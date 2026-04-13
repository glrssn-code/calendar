'use client';

import { useCallback } from 'react';
import { useEvents } from '@/context/EventContext';
import { useStickyNotes } from '@/context/StickyNoteContext';
import { CalendarEvent, CATEGORY_COLORS } from '@/types/event';
import { StickyNote } from '@/types/stickyNote';

// 防止循环同步的标记
const syncingNoteId = new Set<string>();
const syncingEventId = new Set<string>();

/**
 * 处理便签变更并同步到关联的事件
 */
export function useNoteEventSync() {
  const { state, updateEvent } = useEvents();
  const { getNoteById, updateNote } = useStickyNotes();

  // 同步便签完成状态到关联事件
  const syncNoteCompletionToEvents = useCallback((note: StickyNote) => {
    if (syncingNoteId.has(note.id)) return;
    syncingNoteId.add(note.id);

    const linkedIds = note.linkedEventIds || [];
    linkedIds.forEach(eventId => {
      const event = state.events.find(e => e.id === eventId);
      if (event && event.completed !== note.completed) {
        updateEvent({ ...event, completed: note.completed });
      }
    });

    syncingNoteId.delete(note.id);
  }, [state.events, updateEvent]);

  // 同步便签颜色/类别到关联事件
  const syncNoteColorToEvents = useCallback((note: StickyNote) => {
    if (syncingNoteId.has(note.id)) return;
    syncingNoteId.add(note.id);

    // 便签的 color 就是对应的类别
    const category = Object.entries(CATEGORY_COLORS).find(([cat, color]) => color === note.color)?.[0] || '其它';

    const linkedIds = note.linkedEventIds || [];
    linkedIds.forEach(eventId => {
      const event = state.events.find(e => e.id === eventId);
      if (event && (event.category !== category || event.color !== note.color)) {
        updateEvent({ ...event, category, color: note.color });
      }
    });

    syncingNoteId.delete(note.id);
  }, [state.events, updateEvent]);

  // 同步便签标题和内容到关联事件
  const syncNoteTitleToEvents = useCallback((note: StickyNote) => {
    if (syncingNoteId.has(note.id)) return;
    syncingNoteId.add(note.id);

    const linkedIds = note.linkedEventIds || [];
    linkedIds.forEach(eventId => {
      const event = state.events.find(e => e.id === eventId);
      if (event) {
        const needsUpdate =
          event.title !== note.title ||
          event.description !== (note.content || '');

        if (needsUpdate) {
          updateEvent({
            ...event,
            title: note.title,
            description: note.content || '',
          });
        }
      }
    });

    syncingNoteId.delete(note.id);
  }, [state.events, updateEvent]);

  // 同步事件完成状态到便签
  const syncEventCompletionToNote = useCallback((event: CalendarEvent) => {
    if (!event.sourceNoteId || syncingEventId.has(event.id)) return;
    syncingEventId.add(event.id);

    const note = getNoteById(event.sourceNoteId);
    if (note && note.completed !== event.completed) {
      updateNote({ ...note, completed: event.completed });
    }

    syncingEventId.delete(event.id);
  }, [getNoteById, updateNote]);

  // 同步事件类别/颜色到便签
  const syncEventColorToNote = useCallback((event: CalendarEvent) => {
    if (!event.sourceNoteId || syncingEventId.has(event.id)) return;
    syncingEventId.add(event.id);

    const note = getNoteById(event.sourceNoteId);
    if (note && (note.color !== event.color)) {
      updateNote({ ...note, color: event.color });
    }

    syncingEventId.delete(event.id);
  }, [getNoteById, updateNote]);

  // 同步事件标题和内容到便签
  const syncEventTitleToNote = useCallback((event: CalendarEvent) => {
    if (!event.sourceNoteId || syncingEventId.has(event.id)) return;
    syncingEventId.add(event.id);

    const note = getNoteById(event.sourceNoteId);
    if (note) {
      const needsUpdate =
        note.title !== event.title ||
        (note.content || '') !== (event.description || '');

      if (needsUpdate) {
        updateNote({
          ...note,
          title: event.title,
          content: event.description || '',
        });
      }
    }

    syncingEventId.delete(event.id);
  }, [getNoteById, updateNote]);

  return {
    syncNoteCompletionToEvents,
    syncNoteColorToEvents,
    syncNoteTitleToEvents,
    syncEventCompletionToNote,
    syncEventColorToNote,
    syncEventTitleToNote,
  };
}
