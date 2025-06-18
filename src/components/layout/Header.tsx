import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function Header() {
  const { data: session } = useSession();
  
  return (
    <header className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <Link href="/" className="navbar-brand">
          Classroom Notes
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            {session && (
              <>
                <li className="nav-item">
                  <Link href="/dashboard" className="nav-link">
                    Dashboard
                  </Link>
                </li>
                <li className="nav-item">
                  <Link href="/notes" className="nav-link">
                    My Notes
                  </Link>
                </li>
                {session.user.role === 'teacher' && (
                  <li className="nav-item">
                    <Link href="/classroom/create" className="nav-link">
                      Create Classroom
                    </Link>
                  </li>
                )}
                {session.user.role === 'student' && (
                  <li className="nav-item">
                    <Link href="/classroom/join" className="nav-link">
                      Join Classroom
                    </Link>
                  </li>
                )}
              </>
            )}
          </ul>
          <ul className="navbar-nav">
            {session ? (
              <>
                <li className="nav-item">
                  <span className="nav-link">
                    {session.user.name} ({session.user.role})
                  </span>
                </li>
                <li className="nav-item">
                  <button 
                    className="nav-link btn btn-link" 
                    onClick={() => signOut({ callbackUrl: '/' })}
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link href="/login" className="nav-link">
                    Login
                  </Link>
                </li>
                <li className="nav-item">
                  <Link href="/signup" className="nav-link">
                    Sign Up
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </header>
  );
}