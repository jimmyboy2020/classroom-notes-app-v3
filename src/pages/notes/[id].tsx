import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import NoteEditor from '@/components/notes/NoteEditor';
import Link from 'next/link';
import { Note } from '@/types';

export default function NoteDetail() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);
  
  useEffect(() => {
    if (id && status === 'authenticated') {
      const fetchNote = async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/notes/${id}`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch note');
          }
          
          const data = await response.json();
          setNote(data);
        } catch (error) {
          console.error('Error fetching note:', error);
          setError('Failed to load note. Please try again.');
        } finally {
          setLoading(false);
        }
      };
      
      fetchNote();
    }
  }, [id, status]);
  
  const handleSaveNote = async (content: string) => {
    if (!note) return;
    
    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save note');
      }
      
      const updatedNote = await response.json();
      setNote(updatedNote);
    } catch (error) {
      console.error('Error saving note:', error);
      throw error;
    }
  };
  
  if (status === 'loading' || loading) {
    return (
      <Layout title="Loading...">
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Layout>
    );
  }
  
  if (!session) {
    return null; // Will redirect in the useEffect
  }
  
  if (error || !note) {
    return (
      <Layout title="Error - Classroom Notes App">
        <div className="alert alert-danger">
          {error || 'Note not found'}
        </div>
        <Link href="/notes" className="btn btn-primary">
          Back to Notes
        </Link>
      </Layout>
    );
  }
  
  // Determine if user can edit this note (student can edit their copies, teacher can edit originals)
  const canEdit = 
    (session.user.role === 'student' && !note.is_teacher_original && note.user_id === parseInt(session.user.id)) ||
    (session.user.role === 'teacher' && note.is_teacher_original && note.user_id === parseInt(session.user.id));
  
  return (
    <Layout title={`${note.title} - Classroom Notes App`}>
      <div className="mb-4">
        <Link 
          href={note.classroom_id ? `/classroom/${note.classroom_id}` : '/notes'}
          className="btn btn-outline-secondary"
        >
          <i className="bi bi-arrow-left me-2"></i>
          Back to {note.classroom_id ? 'Classroom' : 'Notes'}
        </Link>
      </div>
      
      <NoteEditor 
        note={note} 
        readOnly={!canEdit}
        onSave={canEdit ? handleSaveNote : undefined}
      />
    </Layout>
  );
}