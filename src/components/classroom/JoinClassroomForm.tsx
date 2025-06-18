import { useState } from 'react';
import { useRouter } from 'next/router';

export default function JoinClassroomForm() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setError('Classroom code is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/classrooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to join classroom');
      }
      
      const { classroom_id } = await response.json();
      router.push(`/classroom/${classroom_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="card">
      <div className="card-body">
        <h2 className="card-title mb-4">Join a Classroom</h2>
        
        {error && (
          <div className="alert alert-danger">{error}</div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="code" className="form-label">Classroom Code</label>
            <input
              type="text"
              id="code"
              className="form-control"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading}
              required
            />
            <div className="form-text">
              Enter the classroom code provided by your teacher.
            </div>
          </div>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Joining...' : 'Join Classroom'}
          </button>
        </form>
      </div>
    </div>
  );
}