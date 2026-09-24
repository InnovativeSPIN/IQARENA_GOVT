import pool from '../../config/db.js';

// Helper function to convert status from DB to API format
const convertStatusToString = (status) => {
  // Database stores status as tinyint(1): 1 = active, 0 = inactive
  return status === 1 ? 'active' : 'inactive';
};

export const getBatches = async (req, res) => {
  const { examId, active } = req.query;
  
  try {
    const connection = await pool.getConnection();
    let query = `
      SELECT 
        b.id,
        b.batch_name as name,
        b.exam_id as examId,
        b.status,
        e.name as examName
      FROM batches b
      LEFT JOIN exams e ON b.exam_id = e.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (examId) {
      query += ' AND b.exam_id = ?';
      params.push(examId);
    }

    if (active !== undefined) {
      query += ' AND b.status = ?';
      // Database uses tinyint(1): 1 = active, 0 = inactive
      params.push(active === 'true' ? 1 : 0);
    }
    
    query += ' ORDER BY b.created_at DESC';
    
    console.log('Batch Query:', query);
    console.log('Batch Params:', params);
    
    const [rows] = await connection.execute(query, params);
    
    console.log('Batch Results:', rows.length, 'batches found');
    
    // Convert status to string format for frontend
    const batches = rows.map(batch => ({
      ...batch,
      status: convertStatusToString(batch.status)
    }));
    
    connection.release();
    
    return res.status(200).json({
      success: true,
      batches: batches
    });
  } catch (error) {
    console.error('Error fetching batches:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching batches',
      error: error.message
    });
  }
};

// Get batch by ID
export const getBatchById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT 
        b.id,
        b.batch_name as name,
        b.exam_id as examId,
        b.status
      FROM batches b
      WHERE b.id = ?`,
      [id]
    );
    
    connection.release();
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }
    
    // Convert status to string format for frontend
    const batch = {
      ...rows[0],
      status: convertStatusToString(rows[0].status)
    };
    
    return res.status(200).json({
      success: true,
      batch: batch
    });
  } catch (error) {
    console.error('Error fetching batch:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching batch',
      error: error.message
    });
  }
};

// Create batch
export const createBatch = async (req, res) => {
  const { name, examId, examName, startDate, endDate, status = 'active' } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Batch name is required'
    });
  }

  try {
    const connection = await pool.getConnection();

    // Resolve examId from examName if needed
    let resolvedExamId = examId;

    if (!resolvedExamId) {
      if (!examName) {
        connection.release();
        return res.status(400).json({
          success: false,
          message: 'Exam ID or exam name is required'
        });
      }

      // Try to find existing exam by name
      const [examRows] = await connection.execute(
        'SELECT id FROM exams WHERE name = ?',
        [examName]
      );

      if (examRows.length > 0) {
        resolvedExamId = examRows[0].id;
      } else {
        // Create a new exam entry (minimal fields)
        const [insertRes] = await connection.execute(
          'INSERT INTO exams (name) VALUES (?)',
          [examName]
        );
        resolvedExamId = insertRes.insertId;
      }
    }

    // Convert status string to numeric: 'active' -> 1, 'inactive' -> 0
    const statusValue = status === 'active' ? 1 : 0;

    const [result] = await connection.execute(
      'INSERT INTO batches (batch_name, exam_id, status) VALUES (?, ?, ?)',
      [name, resolvedExamId, statusValue]
    );

    connection.release();

    return res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      batchId: result.insertId,
      examId: resolvedExamId
    });
  } catch (error) {
    console.error('Error creating batch:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating batch',
      error: error.message
    });
  }
};

// Update batch
export const updateBatch = async (req, res) => {
  const { id } = req.params;
  const { name, examId, status } = req.body;
  
  try {
    const connection = await pool.getConnection();
    
    const updates = [];
    const params = [];
    
    if (name !== undefined) {
      updates.push('batch_name = ?');
      params.push(name);
    }
    if (examId !== undefined) {
      updates.push('exam_id = ?');
      params.push(examId);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      // Convert status string to numeric: 'active' -> 1, 'inactive' -> 0
      params.push(status === 'active' ? 1 : 0);
    }
   
    
    if (updates.length === 0) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    params.push(id);
    const query = `UPDATE batches SET ${updates.join(', ')} WHERE id = ?`;
    
    await connection.execute(query, params);
    connection.release();
    
    return res.status(200).json({
      success: true,
      message: 'Batch updated successfully'
    });
  } catch (error) {
    console.error('Error updating batch:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating batch',
      error: error.message
    });
  }
};

// Delete batch
export const deleteBatch = async (req, res) => {
  const { id } = req.params;
  
  try {
    const connection = await pool.getConnection();
    
    // Check for batch existence
    const [batchRows] = await connection.execute(
      'SELECT id, batch_name FROM batches WHERE id = ?',
      [id]
    );
    
    if (batchRows.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }
    
    // Check for linked students (blocks deletion due to FK)
    const [studentRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM students WHERE batch_id = ?',
      [id]
    );
    const studentCount = studentRows[0]?.count || 0;
    
    if (studentCount > 0) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'Cannot delete batch: students are assigned to this batch',
        blockReason: 'students',
        blockCount: studentCount,
        blockDetails: `${studentCount} student(s) assigned to this batch`
      });
    }
    
    // All checks passed - delete the batch
    const [result] = await connection.execute(
      'DELETE FROM batches WHERE id = ?',
      [id]
    );
    
    connection.release();
    
    return res.status(200).json({
      success: true,
      message: 'Batch deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting batch:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting batch',
      error: error.message
    });
  }
};

// Debug: Get all batches without filters (for troubleshooting)
export const getAllBatchesDebug = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Get all batches with all fields
    const [batches] = await connection.execute(
      `SELECT * FROM batches ORDER BY created_at DESC`
    );
    
    // Get all exams for reference
    const [exams] = await connection.execute(
      `SELECT * FROM exams`
    );
    
    connection.release();
    
    return res.status(200).json({
      success: true,
      debug: {
        totalBatches: batches.length,
        batches: batches,
        exams: exams
      }
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching debug data',
      error: error.message
    });
  }
};
