import { useState, useEffect } from 'react';
import { Classroom } from '@/types';
import ClassroomCard from './ClassroomCard';

export default function ClassroomList() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/classrooms');
        
        if (!response.ok) {
          throw new Error('Failed to fetch classrooms');
        }
        
        const data = await response.json();
        setClassrooms(data);
      } catch (error) {
        console.error('Error fetching classrooms:', error);
        setError('Failed to load classrooms. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchClassrooms();
  }, []);
  
  if (loading) {
    return <div className="text-center py-4">Loading classrooms...</div>;
  }
  
  if (error) {
    return (
      <div className="alert alert-danger">
        {error}
      </div>
    );
  }
  
  if (classrooms.length === 0) {
    return (
      <div className="alert alert-info">
        You don't have any classrooms yet.
      </div>
    );
  }
  
  return (
    <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
      {classrooms.map((classroom) => (
        <div key={classroom.id} className="col">
          <ClassroomCard classroom={classroom} />
        </div>
      ))}
    </div>
  );
}