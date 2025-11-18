const pool = require('../config/database');

// Get all branches
const getAllBranches = async (req, res) => {
  try {
    // Only CEO can see all branches
    if (req.user.role !== 'CEO') {
      const [branches] = await pool.execute(
        `SELECT b.*, u.name as manager_name, u.email as manager_email
         FROM branches b
         LEFT JOIN users u ON b.manager_id = u.user_id
         WHERE b.branch_id = ?`,
        [req.user.branch_id]
      );
      return res.json({ branches });
    }

    const [branches] = await pool.execute(
      `SELECT b.*, u.name as manager_name, u.email as manager_email
       FROM branches b
       LEFT JOIN users u ON b.manager_id = u.user_id
       ORDER BY b.branch_name ASC`
    );

    res.json({ branches });
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get branch by ID
const getBranchById = async (req, res) => {
  try {
    const { id } = req.params;

    const [branches] = await pool.execute(
      `SELECT b.*, u.name as manager_name, u.email as manager_email
       FROM branches b
       LEFT JOIN users u ON b.manager_id = u.user_id
       WHERE b.branch_id = ?`,
      [id]
    );

    if (branches.length === 0) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    // Check access
    if (req.user.role !== 'CEO' && parseInt(id) !== req.user.branch_id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ branch: branches[0] });
  } catch (error) {
    console.error('Get branch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new branch
const createBranch = async (req, res) => {
  try {
    // Only CEO can create branches
    if (req.user.role !== 'CEO') {
      return res.status(403).json({ message: 'Only CEO can create branches' });
    }

    const { branch_name, location, manager_id } = req.body;

    // Check if branch name already exists
    const [existing] = await pool.execute(
      'SELECT branch_id FROM branches WHERE branch_name = ?',
      [branch_name]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Branch with this name already exists' });
    }

    const [result] = await pool.execute(
      'INSERT INTO branches (branch_name, location, manager_id) VALUES (?, ?, ?)',
      [branch_name, location, manager_id || null]
    );

    const [newBranch] = await pool.execute(
      `SELECT b.*, u.name as manager_name, u.email as manager_email
       FROM branches b
       LEFT JOIN users u ON b.manager_id = u.user_id
       WHERE b.branch_id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Branch created successfully',
      branch: newBranch[0]
    });
  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update branch
const updateBranch = async (req, res) => {
  try {
    // Only CEO can update branches
    if (req.user.role !== 'CEO') {
      return res.status(403).json({ message: 'Only CEO can update branches' });
    }

    const { id } = req.params;
    const { branch_name, location, manager_id } = req.body;

    // Get existing branch
    const [existing] = await pool.execute(
      'SELECT * FROM branches WHERE branch_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    const updates = [];
    const values = [];

    if (branch_name !== undefined) {
      updates.push('branch_name = ?');
      values.push(branch_name);
    }
    if (location !== undefined) {
      updates.push('location = ?');
      values.push(location);
    }
    if (manager_id !== undefined) {
      updates.push('manager_id = ?');
      values.push(manager_id);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    values.push(id);
    await pool.execute(
      `UPDATE branches SET ${updates.join(', ')} WHERE branch_id = ?`,
      values
    );

    const [updated] = await pool.execute(
      `SELECT b.*, u.name as manager_name, u.email as manager_email
       FROM branches b
       LEFT JOIN users u ON b.manager_id = u.user_id
       WHERE b.branch_id = ?`,
      [id]
    );

    res.json({ message: 'Branch updated successfully', branch: updated[0] });
  } catch (error) {
    console.error('Update branch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete branch
const deleteBranch = async (req, res) => {
  try {
    // Only CEO can delete branches
    if (req.user.role !== 'CEO') {
      return res.status(403).json({ message: 'Only CEO can delete branches' });
    }

    const { id } = req.params;

    // Check if branch exists
    const [existing] = await pool.execute(
      'SELECT * FROM branches WHERE branch_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    // Check if branch has associated data
    const [hasProduce] = await pool.execute(
      'SELECT COUNT(*) as count FROM produce WHERE branch_id = ?',
      [id]
    );

    if (hasProduce[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete branch with associated produce. Please remove all produce first.' 
      });
    }

    await pool.execute('DELETE FROM branches WHERE branch_id = ?', [id]);

    res.json({ message: 'Branch deleted successfully' });
  } catch (error) {
    console.error('Delete branch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch
};



