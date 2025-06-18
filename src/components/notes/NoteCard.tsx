import Link from 'next/link';
import { Note } from '@/types';

interface NoteCardProps {
  note: Note;
}

export default function NoteCard({ note }: NoteCardProps) {
  return (
    <div className="card h-100">
      <div className="card-header">
        <span className={`badge ${note.background_type === 'math' ? 'bg-info' : 'bg-success'}`}>
          {note.background_type === 'math' ? 'Math' : 'Lined'}
        </span>
        {note.is_teacher_original && (
          <span className="badge bg-warning ms-1">Original</span>
        )}
      </div>
      <div className="card-body">
        <h5 className="card-title">{note.title}</h5>
        <p className="card-text">
          <small className="text-muted">
            Created: {new Date(note.created_at).toLocaleDateString()}
          </small>
        </p>
        <Link 
          href={`/notes/${note.id}`}
          className="btn btn-primary mt-2"
        >
          View Note
        </Link>
      </div>
    </div>
  );
}