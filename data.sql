CREATE TABLE companies(
    handle TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    num_employees INTEGER,
    description TEXT,
    logo_url TEXT
);

CREATE TABLE users(
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    photo_url TEXT,
    is_admin BOOLEAN NOT NULL default FALSE
);

CREATE TABLE jobs(
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    salary FLOAT,
    equity FLOAT CHECK(equity <= 1.0),
    company_handle TEXT NOT NULL REFERENCES companies ON DELETE CASCADE
);

CREATE TABLE applications(
    username TEXT NOT NULL REFERENCES users ON DELETE CASCADE,
    job_id INTEGER  REFERENCES jobs ON DELETE CASCADE,
    state TEXT,
    created_at TIMESTAMP DEFAULT current_timestamp,
    PRIMARY KEY(username, job_id)
);
