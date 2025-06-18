import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import pool from '@/lib/db';
import { Note } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Only students can join classrooms
  if (session.user.role !== 'student') {
    return res.status(403).json({ message: 'Only students can join classrooms' });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  const userId = parseInt(session.user.id);
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ message: 'Classroom code is required' });
  }
  
  try {
    // Find the classroom with this code
    const classroomResult = await pool.query(
      'SELECT * FROM classrooms WHERE code = $1',
      [code]
    );
    
    if (classroomResult.rows.length === 0) {
      return res.status(404).json({ message: 'Classroom not found with this code' });
    }
    
    const classroom = classroomResult.rows[0];
    
    // Check if student is already a member
    const membershipCheck = await pool.query(
      'SELECT * FROM classroom_members WHERE classroom_id = $1 AND user_id = $2',
      [classroom.id, userId]
    );
    
    if (membershipCheck.rows.length > 0) {
      return res.status(400).json({ message: 'You are already a member of this classroom' });
    }
    
    // Add student to classroom
    await pool.query(
      'INSERT INTO classroom_members (classroom_id, user_id) VALUES ($1, $2)',
      [classroom.id, userId]
    );

    // Fetch all original teacher notes for this classroom
    const originalNotesResult = await pool.query(
      'SELECT * FROM notes WHERE classroom_id = $1 AND is_teacher_original = true',
      [classroom.id]
    );
    const originalNotes: Note[] = originalNotesResult.rows;

    // Create a copy of each original note for the new student
    for (const originalNote of originalNotes) {
      await pool.query(
        `INSERT INTO notes 
         (title, content, background_type, classroom_id, user_id, is_teacher_original, original_note_id) 
         VALUES ($1, $2, $3, $4, $5, false, $6)`,
        [
          originalNote.title,
          originalNote.content,
          originalNote.background_type,
          originalNote.classroom_id,
          userId, // The ID of the student joining
          originalNote.id // The ID of the original teacher's note
        ]
      );
    }
    
    return res.status(200).json({ 
      message: 'Successfully joined classroom', 
      classroom_id: classroom.id 
    });
  } catch (error) {
    console.error('Error joining classroom:', error);
    return res.status(500).json({ message: 'Error joining classroom' });
  }
}