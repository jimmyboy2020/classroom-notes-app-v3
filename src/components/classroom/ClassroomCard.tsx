import Link from 'next/link';
import { Classroom } from '@/types';
import { useSession } from 'next-auth/react';

interface ClassroomCardProps {
  classroom: Classroom;
}

export default function ClassroomCard({ classroom }: ClassroomCardProps) {
  const { data: session } = useSession();
  const isTeacher = session?.user?.role === 'teacher';
  
  return (
    <div className="card h-100">
      <div className="card-body">
        <h5 className="card-title">{classroom.name}</h5>
        {isTeacher && (
          <p className="card-text">
            <small className="text-muted">Code: {classroom.code}</small>
          </p>
        )}
        <Link 
          href={`/classroom/${classroom.id}`}
          className="btn btn-primary mt-2"
        >
          View Classroom
        </Link>
      </div>
    </div>
  );
}