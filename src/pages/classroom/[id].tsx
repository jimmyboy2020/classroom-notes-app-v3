import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import NotesList from '@/components/notes/NotesList';
import Link from 'next/link';
import { Classroom } from '@/types';

export default function ClassroomDetail() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);
  
  useEffect(() => {
    if (id && status === 'authenticated') {
      const fetchClassroom = async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/classrooms/${id}`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch classroom');
          }
          
          const data = await response.json();
          setClassroom(data);
        } catch (error) {
          console.error('Error fetching classroom:', error);
          setError('Failed to load classroom. Please try again.');
        } finally {
          setLoading(false);
        }
      };
      
      fetchClassroom();
    }
  }, [id, status]);
  
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
  
  if (error || !classroom) {
    return (
      <Layout title="Error - Classroom Notes App">
        <div className="alert alert-danger">
          {error || 'Classroom not found'}
        </div>
        <Link href="/dashboard" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </Layout>
    );
  }
  
  const isTeacher = session.user.role === 'teacher';
  
  return (
    <Layout title={`${classroom.name} - Classroom Notes App`}>
      <div className="row mb-4 align-items-center">
        <div className="col">
          <h1>{classroom.name}</h1>
          {isTeacher && (
            <p className="mb-0">
              <span className="badge bg-info me-2">Classroom Code: {classroom.code}</span>
              Share this code with your students
            </p>
          )}
        </div>
        <div className="col-auto">
          {isTeacher && (
            <Link 
              href={`/notes/create?classroom_id=${classroom.id}`}
              className="btn btn-primary"
            >
              <i className="bi bi-plus-circle me-2"></i>Create Note
            </Link>
          )}
        </div>
      </div>
      
      <div className="card shadow-sm">
        <div className="card-header">
          <h3 className="mb-0">Notes</h3>
        </div>
        <div className="card-body">
          <NotesList classroomId={parseInt(id as string)} />
        </div>
      </div>
    </Layout>
  );
}