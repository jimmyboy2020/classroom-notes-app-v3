import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import CreateClassroomForm from '@/components/classroom/CreateClassroomForm';

export default function CreateClassroom() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
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
  
  return (
    <Layout title="Create Classroom - Classroom Notes App">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <h1 className="mb-4">Create a New Classroom</h1>
          <CreateClassroomForm />
        </div>
      </div>
    </Layout>
  );
}