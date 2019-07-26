const bcrypt = require("bcrypt");
const db = require("./db");

// Database DDL (for tests)
const DDL = `

  CREATE TABLE companies (
      handle TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      num_employees INTEGER,
      description TEXT,
      logo_url TEXT
  );

  CREATE TABLE jobs (
      id SERIAL PRIMARY KEY,
      title TEXT,
      salary FLOAT,
      equity FLOAT CHECK (equity <= 1.0),
      company_handle TEXT NOT NULL REFERENCES companies(handle) ON DELETE CASCADE
  );

  CREATE TABLE users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      photo_url TEXT,
      is_admin BOOLEAN default FALSE
  );

  CREATE TABLE applications (
      username TEXT NOT NULL REFERENCES users (username) ON DELETE CASCADE,
      job_id INTEGER  REFERENCES jobs (id) ON DELETE CASCADE,
      state TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (username, job_id)
  );`;

async function seedData() {
  try {
    await db.query(DDL);
    const hashedPassword = await bcrypt.hash("secret", 1);
    const user = await db.query(
      `INSERT INTO users (username, password, is_admin)
                  VALUES ('test', $1, 'true')`,
      [hashedPassword]
    );
    const company1 = await db.query(`
  INSERT INTO companies(handle, name, num_employees) VALUES
    ('apple', 'apple inc', 1000),
    ('nike', 'nike inc', 200),
    ('rithm', 'rithm school', 10),
    ('starbucks', 'starbucks inc', 500);

  INSERT INTO jobs(title, salary, company_handle) VALUES
    ('engineer', 100000, 'apple'),
    ('plumber', 120000, 'apple'),
    ('barista', 200000, 'nike');

  INSERT INTO applications(username, job_id, state) VALUES
    ('test', 1, 'applied'),
    ('test', 2, 'rejected'),
    ('test', 3, 'applied');
  `);
  } catch (err) {
    console.log("Something went wrong!");
    console.log(err);
    process.exit(1);
  }
}

seedData().then(() => {
  console.log("Successful seed!");
  process.exit();
});
