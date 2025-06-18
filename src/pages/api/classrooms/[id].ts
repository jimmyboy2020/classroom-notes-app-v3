import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const userId = parseInt(session.user.id);
  const classroomId = parseInt(req.query.id as string);
  
  if (isNaN(classroomId)) {
    return res.status(400).json({ message: 'Invalid classroom ID' });
  }
  
  switch (req.method) {
    case 'GET':
      try {
        // Check if user has access to this classroom
        let hasAccess = false;
        
        if (session.user.role === 'teacher') {
          // Teachers need to be the creator
          const teacherCheck = await pool.query(
            'SELECT * FROM classrooms WHERE id = $1 AND teacher_id = $2',
            [classroomId, userId]
          );
          
          hasAccess = teacherCheck.rows.length > 0;
        } else {
          // Students need to be a member
          const studentCheck = await pool.query(
            'SELECT * FROM classroom_members WHERE classroom_id = $1 AND user_id = $2',
            [classroomId, userId]
          );
          
          hasAccess = studentCheck.rows.length > 0;
        }
        
        if (!hasAccess) {
          return res.status(403).json({ message: 'You do not have access to this classroom' });
        }
        
        // Get classroom details
        const result = await pool.query(
          'SELECT * FROM classrooms WHERE id = $1',
          [classroomId]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ message: 'Classroom not found' });
        }
        
        return res.status(200).json(result.rows[0]);
      } catch (error) {
        console.error('Error fetching classroom:', error);
        return res.status(500).json({ message: 'Error fetching classroom' });
      }
      
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}