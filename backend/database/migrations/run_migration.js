import pool from '../../config/db.js';

async function runMigration() {
  const conn = await pool.getConnection();

  const stmts = [
    // 1. schools
    `CREATE TABLE IF NOT EXISTS \`schools\` (
      \`id\`            INT NOT NULL AUTO_INCREMENT,
      \`school_name\`   VARCHAR(255) NOT NULL,
      \`school_code\`   VARCHAR(50)  DEFAULT NULL,
      \`district\`      VARCHAR(100) DEFAULT NULL,
      \`block\`         VARCHAR(100) DEFAULT NULL,
      \`address\`       TEXT         DEFAULT NULL,
      \`contact_phone\` VARCHAR(15)  DEFAULT NULL,
      \`status\`        TINYINT(1)   DEFAULT 1,
      \`created_at\`    TIMESTAMP    NOT NULL DEFAULT current_timestamp(),
      \`updated_at\`    TIMESTAMP    NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uniq_school_code\` (\`school_code\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // 2. school_students
    `CREATE TABLE IF NOT EXISTS \`school_students\` (
      \`id\`           INT NOT NULL AUTO_INCREMENT,
      \`emis_no\`      VARCHAR(50)  NOT NULL,
      \`student_name\` VARCHAR(150) NOT NULL,
      \`school_id\`    INT NOT NULL,
      \`standard\`     VARCHAR(20)  NOT NULL,
      \`section\`      VARCHAR(10)  DEFAULT NULL,
      \`gender\`       ENUM('Male','Female','Other') DEFAULT NULL,
      \`dob\`          DATE         DEFAULT NULL,
      \`phone\`        VARCHAR(15)  DEFAULT NULL,
      \`user_id\`      INT          DEFAULT NULL,
      \`status\`       TINYINT(1)   DEFAULT 1,
      \`created_at\`   TIMESTAMP    NOT NULL DEFAULT current_timestamp(),
      \`updated_at\`   TIMESTAMP    NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uniq_emis\` (\`emis_no\`),
      KEY \`idx_ss_school\` (\`school_id\`),
      KEY \`idx_ss_user\` (\`user_id\`),
      KEY \`idx_ss_standard\` (\`standard\`),
      CONSTRAINT \`fk_ss_school\` FOREIGN KEY (\`school_id\`) REFERENCES \`schools\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`fk_ss_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // 3. school_test_assignments
    `CREATE TABLE IF NOT EXISTS \`school_test_assignments\` (
      \`id\`          INT NOT NULL AUTO_INCREMENT,
      \`test_id\`     INT NOT NULL,
      \`school_id\`   INT NOT NULL,
      \`standard\`    VARCHAR(20) DEFAULT NULL,
      \`assigned_at\` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uniq_test_school_std\` (\`test_id\`, \`school_id\`, \`standard\`),
      KEY \`idx_sta_test\` (\`test_id\`),
      KEY \`idx_sta_school\` (\`school_id\`),
      CONSTRAINT \`fk_sta_test\` FOREIGN KEY (\`test_id\`) REFERENCES \`tests\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`fk_sta_school\` FOREIGN KEY (\`school_id\`) REFERENCES \`schools\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // 4. exam types
    `INSERT IGNORE INTO \`exams\` (\`name\`) VALUES ('NMMS')`,
    `INSERT IGNORE INTO \`exams\` (\`name\`) VALUES ('TRUST')`,
  ];

  // Conditional ALTERs
  const [testCols] = await conn.query(`SHOW COLUMNS FROM tests LIKE 'school_id'`);
  if (testCols.length === 0) {
    stmts.push(`ALTER TABLE \`tests\` ADD COLUMN \`school_id\` INT DEFAULT NULL AFTER \`batch_id\``);
    stmts.push(`ALTER TABLE \`tests\` ADD KEY \`fk_tests_school\` (\`school_id\`)`);
    stmts.push(`ALTER TABLE \`tests\` ADD CONSTRAINT \`fk_tests_school\` FOREIGN KEY (\`school_id\`) REFERENCES \`schools\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`);
  }

  const [atCols] = await conn.query(`SHOW COLUMNS FROM student_test_attempts LIKE 'school_student_id'`);
  if (atCols.length === 0) {
    stmts.push(`ALTER TABLE \`student_test_attempts\` ADD COLUMN \`school_student_id\` INT DEFAULT NULL AFTER \`student_id\``);
    stmts.push(`ALTER TABLE \`student_test_attempts\` ADD KEY \`fk_sta_ss\` (\`school_student_id\`)`);
    stmts.push(`ALTER TABLE \`student_test_attempts\` ADD CONSTRAINT \`fk_sta_school_student\` FOREIGN KEY (\`school_student_id\`) REFERENCES \`school_students\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`);
  }

  let success = 0, skipped = 0, failed = 0;
  for (const stmt of stmts) {
    try {
      await conn.query(stmt);
      console.log(`✅ OK: ${stmt.slice(0,70).replace(/\s+/g,' ')}...`);
      success++;
    } catch (err) {
      if (['ER_TABLE_EXISTS_ERROR','ER_DUP_KEYNAME','ER_FK_DUP_NAME','ER_DUP_ENTRY','ER_DUP_FIELDNAME'].includes(err.code)) {
        console.log(`⏭️  SKIP (already exists): ${stmt.slice(0,60).replace(/\s+/g,' ')}...`);
        skipped++;
      } else {
        console.error(`❌ FAIL [${err.code}]: ${stmt.slice(0,70).replace(/\s+/g,' ')}...`);
        console.error(`   ${err.message}`);
        failed++;
      }
    }
  }

  conn.release();
  console.log(`\n🏁 Done: ${success} executed, ${skipped} skipped, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runMigration().catch(e => { console.error(e); process.exit(1); });
