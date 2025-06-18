import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import pool from '@/lib/db';
import { generateClassroomCode } from '@/lib/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const userId = parseInt(session.user.id);
  
  switch (req.method) {
    case 'GET':
      try {
        let query = '';
        
        if (session.user.role === 'teacher') {
          // Teachers see classrooms they created
          query = 'SELECT * FROM classrooms WHERE teacher_id = $1 ORDER BY created_at DESC';
        } else {
          // Students see classrooms they are members of
          query = `
            SELECT c.* FROM classrooms c
            JOIN classroom_members cm ON c.id = cm.classroom_id
            WHERE cm.user_id = $1
            ORDER BY c.created_at DESC
          `;
        }
        
        const result = await pool.query(query, [userId]);
        return res.status(200).json(result.rows);
      } catch (error) {
        console.error('Error fetching classrooms:', error);
        return res.status(500).json({ message: 'Error fetching classrooms' });
      }
      
    case 'POST':
      try {
        // Only teachers can create classrooms
        if (session.user.role !== 'teacher') {
          return res.status(403).json({ message: 'Only teachers can create classrooms' });
        }
        
        const { name } = req.body;
        
        if (!name) {
          return res.status(400).json({ message: 'Classroom name is required' });
        }
        
        // Generate a unique classroom code
        let code = generateClassroomCode();
        let codeExists = true;
        
        // Ensure code is unique
        while (codeExists) {
          const checkResult = await pool.query(
            'SELECT * FROM classrooms WHERE code = $1',
            [code]
          );
          
          if (checkResult.rows.length === 0) {
            codeExists = false;
          } else {
            code = generateClassroomCode();
          }
        }
        
        const result = await pool.query(
          'INSERT INTO classrooms (name, code, teacher_id) VALUES ($1, $2, $3) RETURNING *',
          [name, code, userId]
        );
        
        return res.status(201).json(result.rows[0]);
      } catch (error) {
        console.error('Error creating classroom:', error);
        return res.status(500).json({ message: 'Error creating classroom' });
      }
      
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}