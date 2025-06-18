import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import NotesList from '@/components/notes/NotesList';

export default function Notes() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);
  
  if (status === 'loading') {
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
  
  return (
    <Layout title="All Notes - Classroom Notes App">
      <div className="row mb-4">
        <div className="col">
          <h1>My Notes</h1>
          <p className="lead">All your notes across all classrooms</p>
        </div>
      </div>
      
      <div className="card shadow-sm">
        <div className="card-body">
          <NotesList />
        </div>
      </div>
    </Layout>
  );
}