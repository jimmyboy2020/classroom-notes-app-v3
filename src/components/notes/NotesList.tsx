import { useState, useEffect } from 'react';
import { Note } from '@/types';
import NoteCard from './NoteCard';

interface NotesListProps {
  classroomId?: number;
}

export default function NotesList({ classroomId }: NotesListProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        let url = '/api/notes';
        if (classroomId) {
          url += `?classroom_id=${classroomId}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch notes');
        }
        
        const data = await response.json();
        setNotes(data);
      } catch (error) {
        console.error('Error fetching notes:', error);
        setError('Failed to load notes. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotes();
  }, [classroomId]);
  
  if (loading) {
    return <div className="text-center py-4">Loading notes...</div>;
  }
  
  if (error) {
    return (
      <div className="alert alert-danger">
        {error}
      </div>
    );
  }
  
  if (notes.length === 0) {
    return (
      <div className="alert alert-info">
        No notes found.
      </div>
    );
  }
  
  return (
    <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
      {notes.map((note) => (
        <div key={note.id} className="col">
          <NoteCard note={note} />
        </div>
      ))}
    </div>
  );
}