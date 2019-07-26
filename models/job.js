const db = require("../db");
const ExpressError = require("../helpers/ExpressError");
const sqlForPartialUpdate = require("../helpers/partialUpdate");

/** Related functions for companies. */

class Job {
  /** Find all jobs (can filter on terms in data). */

  static async findAll(data) {
    let baseQuery = "SELECT id, title, company_handle FROM jobs";
    let whereExpressions = [];
    let queryValues = [];

    // For each possible search term, add to whereExpressions and
    // queryValues so we can generate the right SQL

    if (data.min_salary) {
      queryValues.push(+data.min_employees);
      whereExpressions.push(`min_salary >= $${queryValues.length}`);
    }

    if (data.max_equity) {
      queryValues.push(+data.max_employees);
      whereExpressions.push(`min_equity >= $${queryValues.length}`);
    }

    if (data.search) {
      queryValues.push(`%${data.search}%`);
      whereExpressions.push(`title ILIKE $${queryValues.length}`);
    }

    if (whereExpressions.length > 0) {
      baseQuery += " WHERE ";
    }

    // Finalize query and return results

    let finalQuery = baseQuery + whereExpressions.join(" AND ");
    const jobsRes = await db.query(finalQuery, queryValues);
    return jobsRes.rows;
  }

  /** Given a job id, return data about job. */

  static async findOne(id) {
    const jobRes = await db.query(
      `SELECT id, title, salary, equity, company_handle 
        FROM jobs 
        WHERE id = $1`,
      [id]
    );

    const job = jobRes.rows[0];

    if (!job) {
      throw new ExpressError(`There exists no job '${id}'`, 404);
    }

    const companiesRes = await db.query(
      `SELECT name, num_employees, description, logo_url 
        FROM companies 
        WHERE handle = $1`,
      [job.company_handle]
    );

    job.company = companiesRes.rows[0];

    return job;
  }

  /** Create a job (from data), update db, return new job data. */

  static async create(data) {
    const result = await db.query(
      `INSERT INTO jobs (title, salary, equity, company_handle) 
        VALUES ($1, $2, $3, $4) 
        RETURNING id, title, salary, equity, company_handle`,
      [data.title, data.salary, data.equity, data.company_handle]
    );

    return result.rows[0];
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain
   * all the fields; this only changes provided ones.
   *
   * Return data for changed job.
   *
   */

  static async update(id, data) {
    let { query, values } = sqlForPartialUpdate("jobs", data, "id", id);

    const result = await db.query(query, values);
    const job = result.rows[0];

    if (!job) {
      throw new ExpressError(`There exists no job '${id}`, 404);
    }

    return job;
  }

  /** Delete given job from database; returns undefined. */

  static async remove(id) {
    const result = await db.query(
      `DELETE FROM jobs 
        WHERE id = $1 
        RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new ExpressError(`There exists no job '${id}`, 404);
    }
  }

  /** Apply for job: update db, returns undefined. */

  static async apply(id, username, state) {
    const result = await db.query(
      `SELECT id 
        FROM jobs 
        WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw ExpressError(`There exists no job '${id}`, 404);
    }

    await db.query(
      `INSERT INTO applications (job_id, username, state)
        VALUES ($1, $2, $3)`,
      [id, username, state]
    );
  }
}

module.exports = Job;
