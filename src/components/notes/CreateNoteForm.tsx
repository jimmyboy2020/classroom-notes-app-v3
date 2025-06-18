import { useState } from 'react';
import { useRouter } from 'next/router';

interface CreateNoteFormProps {
  classroomId: number;
}

export default function CreateNoteForm({ classroomId }: CreateNoteFormProps) {
  const [title, setTitle] = useState('');
  const [backgroundType, setBackgroundType] = useState<'math' | 'lined'>('lined');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Note title is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          background_type: backgroundType,
          classroom_id: classroomId,
          content: JSON.stringify({ objects: [], background: backgroundType }),
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create note');
      }
      
      const note = await response.json();
      router.push(`/notes/${note.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="card">
      <div className="card-body">
        <h2 className="card-title mb-4">Create a New Note</h2>
        
        {error && (
          <div className="alert alert-danger">{error}</div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="title" className="form-label">Note Title</label>
            <input
              type="text"
              id="title"
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          
          <div className="mb-3">
            <label className="form-label d-block">Background Type</label>
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="radio"
                name="backgroundType"
                id="mathBackground"
                value="math"
                checked={backgroundType === 'math'}
                onChange={() => setBackgroundType('math')}
                disabled={loading}
              />
              <label className="form-check-label" htmlFor="mathBackground">
                Math (Grid)
              </label>
            </div>
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="radio"
                name="backgroundType"
                id="linedBackground"
                value="lined"
                checked={backgroundType === 'lined'}
                onChange={() => setBackgroundType('lined')}
                disabled={loading}
              />
              <label className="form-check-label" htmlFor="linedBackground">
                Lined
              </label>
            </div>
          </div>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Note'}
          </button>
        </form>
      </div>
    </div>
  );
}