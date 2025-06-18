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
  const noteId = parseInt(req.query.id as string);
  
  if (isNaN(noteId)) {
    return res.status(400).json({ message: 'Invalid note ID' });
  }
  
  switch (req.method) {
    case 'GET':
      try {
        const result = await pool.query(
          'SELECT * FROM notes WHERE id = $1',
          [noteId]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ message: 'Note not found' });
        }
        
        const note = result.rows[0];
        
        // Check if user has access to view the note
        // Teachers can view their original notes.
        // Students can view their own copies.
        // Students can also view original teacher notes if they are in the classroom.
        let canView = false;
        if (session.user.role === 'teacher' && note.is_teacher_original && note.user_id === userId) {
          canView = true; // Teacher owns original
        } else if (!note.is_teacher_original && note.user_id === userId) {
          canView = true; // User owns this copy (could be student or teacher's own copy if they made one, though current logic doesn't support teacher copies)
        } else if (session.user.role === 'student' && note.is_teacher_original) {
          // Student trying to view an original teacher note, check classroom membership
          const classroomCheck = await pool.query(
            'SELECT * FROM classroom_members WHERE classroom_id = $1 AND user_id = $2',
            [note.classroom_id, userId]
          );
          if (classroomCheck.rows.length > 0) {
            canView = true;
          }
        }
        
        if (canView) {
          return res.status(200).json(note);
        } else {
          return res.status(403).json({ message: 'You do not have access to this note' });
        }
      } catch (error) {
        console.error('Error fetching note:', error);
        return res.status(500).json({ message: 'Error fetching note' });
      }
      
    case 'PUT':
      try {
        const checkResult = await pool.query(
          'SELECT * FROM notes WHERE id = $1',
          [noteId]
        );
        
        if (checkResult.rows.length === 0) {
          return res.status(404).json({ message: 'Note not found' });
        }
        
        const note = checkResult.rows[0];
        
        // Permission check:
        // Teachers can only edit their original notes.
        // Students can only edit their copies.
        const isTeacherEditingOwnOriginal = session.user.role === 'teacher' && note.is_teacher_original && note.user_id === userId;
        const isStudentEditingOwnCopy = session.user.role === 'student' && !note.is_teacher_original && note.user_id === userId;

        if (!isTeacherEditingOwnOriginal && !isStudentEditingOwnCopy) {
          return res.status(403).json({ message: 'You do not have permission to edit this note' });
        }
        
        const { content } = req.body;
        
        if (content === undefined) {
          return res.status(400).json({ message: 'Content is required' });
        }
        
        let updatedNoteData;

        if (isStudentEditingOwnCopy) {
            // Student is editing their copy
            const result = await pool.query(
                'UPDATE notes SET content = $1, updated_at = NOW(), modified_by_student = TRUE WHERE id = $2 RETURNING *',
                [content, noteId]
            );
            updatedNoteData = result.rows[0];
        } else { // isTeacherEditingOwnOriginal
            // Teacher is editing their original note
            const result = await pool.query(
                'UPDATE notes SET content = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
                [content, noteId]
            );
            updatedNoteData = result.rows[0];

            // Propagate to student copies that haven't been modified by students
            await pool.query(
                `UPDATE notes 
                 SET content = $1, updated_at = NOW() 
                 WHERE original_note_id = $2 AND is_teacher_original = false AND modified_by_student = false`,
                [updatedNoteData.content, noteId] // noteId is the ID of the original teacher's note
            );
        }
        
        return res.status(200).json(updatedNoteData);
      } catch (error) {
        console.error('Error updating note:', error);
        return res.status(500).json({ message: 'Error updating note' });
      }
      
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}