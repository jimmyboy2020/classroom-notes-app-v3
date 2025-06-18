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
  
  switch (req.method) {
    case 'GET':
      try {
        const { classroom_id } = req.query;
        
        let query = 'SELECT * FROM notes WHERE user_id = $1';
        let params = [userId];
        
        if (classroom_id) {
          query += ' AND classroom_id = $2';
          params.push(parseInt(classroom_id as string));
        }
        
        query += ' ORDER BY created_at DESC';
        
        const result = await pool.query(query, params);
        return res.status(200).json(result.rows);
      } catch (error) {
        console.error('Error fetching notes:', error);
        return res.status(500).json({ message: 'Error fetching notes' });
      }
      
    case 'POST':
      try {
        // Only teachers can create original notes
        if (session.user.role !== 'teacher') {
          return res.status(403).json({ message: 'Only teachers can create notes' });
        }
        
        const { title, content, background_type, classroom_id } = req.body;
        
        if (!title || !classroom_id || !background_type) {
          return res.status(400).json({ message: 'Missing required fields' });
        }
        
        // Validate background type
        if (background_type !== 'math' && background_type !== 'lined') {
          return res.status(400).json({ message: 'Invalid background type' });
        }
        
        // Check if classroom exists and teacher has access to it
        const classroomCheck = await pool.query(
          'SELECT * FROM classrooms WHERE id = $1 AND teacher_id = $2',
          [classroom_id, userId]
        );
        
        if (classroomCheck.rows.length === 0) {
          return res.status(403).json({ message: 'You do not have access to this classroom' });
        }
        
        // Create the teacher's original note
        const noteResult = await pool.query(
          `INSERT INTO notes 
           (title, content, background_type, classroom_id, user_id, is_teacher_original) 
           VALUES ($1, $2, $3, $4, $5, true) 
           RETURNING *`,
          [title, content, background_type, classroom_id, userId]
        );
        
        const originalNote = noteResult.rows[0];
        
        // Create a copy for each student in the classroom
        const studentsResult = await pool.query(
          `SELECT user_id FROM classroom_members WHERE classroom_id = $1`,
          [classroom_id]
        );
        
        const students = studentsResult.rows;
        
        // Create copies for each student
        for (const student of students) {
          await pool.query(
            `INSERT INTO notes 
             (title, content, background_type, classroom_id, user_id, is_teacher_original, original_note_id) 
             VALUES ($1, $2, $3, $4, $5, false, $6)`,
            [
              title, 
              content, 
              background_type, 
              classroom_id, 
              student.user_id, 
              originalNote.id
            ]
          );
        }
        
        return res.status(201).json(originalNote);
      } catch (error) {
        console.error('Error creating note:', error);
        return res.status(500).json({ message: 'Error creating note' });
      }
      
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}