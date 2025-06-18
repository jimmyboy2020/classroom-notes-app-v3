import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import Link from 'next/link';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);
  
  return (
    <Layout title="Classroom Notes App">
      <div className="row align-items-center py-5">
        <div className="col-lg-6">
          <h1 className="display-4 fw-bold">Welcome to Classroom Notes</h1>
          <p className="lead mb-4">
            An interactive platform for teachers to share notes with students, who can then personalize them for their own learning.
          </p>
          
          {status === 'unauthenticated' ? (
            <div className="d-grid gap-2 d-md-flex">
              <Link href="/login" className="btn btn-primary btn-lg px-4 me-md-2">
                Login
              </Link>
              <Link href="/signup" className="btn btn-outline-secondary btn-lg px-4">
                Sign Up
              </Link>
            </div>
          ) : status === 'loading' ? (
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          ) : null}
        </div>
        <div className="col-lg-6">
          <div className="card shadow-lg p-3">
            <div className="card-body">
              <h3 className="card-title">Features</h3>
              <ul className="list-group list-group-flush">
                <li className="list-group-item">
                  <i className="bi bi-person-workspace text-primary me-2"></i>
                  Teachers can create classrooms and share notes
                </li>
                <li className="list-group-item">
                  <i className="bi bi-people text-primary me-2"></i>
                  Students join classrooms with a unique code
                </li>
                <li className="list-group-item">
                  <i className="bi bi-pencil-square text-primary me-2"></i>
                  Students get their own editable copies of notes
                </li>
                <li className="list-group-item">
                  <i className="bi bi-grid-3x3 text-primary me-2"></i>
                  Math notes with grid backgrounds for precise drawing
                </li>
                <li className="list-group-item">
                  <i className="bi bi-list-ul text-primary me-2"></i>
                  Lined backgrounds for other subjects
                </li>
                <li className="list-group-item">
                  <i className="bi bi-brush text-primary me-2"></i>
                  Draw, highlight, and add text or shapes to notes
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}