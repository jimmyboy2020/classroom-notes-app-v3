import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import JoinClassroomForm from '@/components/classroom/JoinClassroomForm';

export default function JoinClassroom() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session.user.role !== 'student') {
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
  
  if (!session || session.user.role !== 'student') {
    return null; // Will redirect in the useEffect
  }
  
  return (
    <Layout title="Join Classroom - Classroom Notes App">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <h1 className="mb-4">Join a Classroom</h1>
          <JoinClassroomForm />
        </div>
      </div>
    </Layout>
  );
}