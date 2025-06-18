import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import CreateNoteForm from '@/components/notes/CreateNoteForm';
import Link from 'next/link';

export default function CreateNote() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { classroom_id } = router.query;
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session.user.role !== 'teacher') {
      router.push('/dashboard');
    }
  }, [status, session, router]);
  
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
  
  if (!session || session.user.role !== 'teacher') {
    return null; // Will redirect in the useEffect
  }
  
  if (!classroom_id) {
    return (
      <Layout title="Error - Classroom Notes App">
        <div className="alert alert-danger">
          No classroom selected. Please select a classroom to create a note.
        </div>
        <Link href="/dashboard" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </Layout>
    );
  }
  
  return (
    <Layout title="Create Note - Classroom Notes App">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>Create a New Note</h1>
            <Link href={`/classroom/${classroom_id}`} className="btn btn-outline-secondary">
              Back to Classroom
            </Link>
          </div>
          <CreateNoteForm classroomId={parseInt(classroom_id as string)} />
        </div>
      </div>
    </Layout>
  );
}