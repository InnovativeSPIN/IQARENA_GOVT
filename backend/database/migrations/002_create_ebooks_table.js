import pool from '../../config/db.js';

async function migrate() {
  try {
    console.log('Running migration: create ebooks table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`ebooks\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`title\` VARCHAR(255) NOT NULL,
        \`author\` VARCHAR(150) DEFAULT NULL,
        \`class_grade\` VARCHAR(50) DEFAULT NULL,
        \`subject_name\` VARCHAR(100) DEFAULT NULL,
        \`exam_name\` VARCHAR(100) DEFAULT NULL,
        \`description\` TEXT DEFAULT NULL,
        \`file_url\` VARCHAR(500) NOT NULL,
        \`cover_url\` VARCHAR(500) DEFAULT NULL,
        \`file_size\` VARCHAR(50) DEFAULT NULL,
        \`file_type\` VARCHAR(50) DEFAULT 'pdf',
        \`status\` TINYINT(1) DEFAULT 1,
        \`download_count\` INT DEFAULT 0,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ ebooks table created successfully');

    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrate();
