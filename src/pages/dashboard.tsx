import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import ClassroomList from '@/components/classroom/ClassroomList';
import Link from 'next/link';

export default function Dashboard() {
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
    <Layout title="Dashboard - Classroom Notes App">
      <div className="row mb-4 align-items-center">
        <div className="col">
          <h1>Dashboard</h1>
          <p className="lead">Welcome back, {session.user.name}!</p>
        </div>
        <div className="col-auto">
          {session.user.role === 'teacher' ? (
            <Link href="/classroom/create" className="btn btn-primary">
              <i className="bi bi-plus-circle me-2"></i>Create Classroom
            </Link>
          ) : (
            <Link href="/classroom/join" className="btn btn-primary">
              <i className="bi bi-box-arrow-in-right me-2"></i>Join Classroom
            </Link>
          )}
        </div>
      </div>
      
      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="mb-0">My Classrooms</h3>
              <Link href="/notes" className="btn btn-outline-primary btn-sm">
                View All Notes
              </Link>
            </div>
            <div className="card-body">
              <ClassroomList />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}