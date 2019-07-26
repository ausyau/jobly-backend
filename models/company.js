const db = require("../db");
const ExpressError = require("../helpers/ExpressError");
const sqlForPartialUpdate = require("../helpers/partialUpdate");

/** Related functions for companies. */

class Company {
  /** Find all companies (can filter on terms in data). */

  static async findAll(data) {
    let baseQuery = `SELECT handle, name FROM companies`;
    let whereExpressions = [];
    let queryValues = [];

    if (+data.min_employees >= +data.max_employees) {
      throw new ExpressError(
        "Min employees must be less than max employees",
        400
      );
    }

    // For each possible search term, add to whereExpressions and
    // queryValues so we can generate the right SQL

    if (data.min_employees) {
      queryValues.push(+data.min_employees);
      whereExpressions.push(`num_employees >= $${queryValues.length}`);
    }

    if (data.max_employees) {
      queryValues.push(+data.max_employees);
      whereExpressions.push(`num_employees <= $${queryValues.length}`);
    }

    if (data.search) {
      queryValues.push(`%${data.search}%`);
      whereExpressions.push(`name ILIKE $${queryValues.length}`);
    }

    if (whereExpressions.length > 0) {
      baseQuery += " WHERE ";
    }

    // Finalize query and return results

    let finalQuery =
      baseQuery + whereExpressions.join(" AND ") + " ORDER BY name";
    const companiesRes = await db.query(finalQuery, queryValues);
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company. */

  static async findOne(handle) {
    const companyRes = await db.query(
      `SELECT handle, name, num_employees, description, logo_url
            FROM companies
            WHERE handle = $1`,
      [handle]
    );

    const company = companyRes.rows[0];

    if (!company) {
      throw new ExpressError(`There exists no company '${handle}'`, 404);
    }

    const jobsRes = await db.query(
      `SELECT id, title, salary, equity
            FROM jobs 
            WHERE company_handle = $1`,
      [handle]
    );

    company.jobs = jobsRes.rows;

    return company;
  }

  /** Create a company (from data), update db, return new company data. */

  static async create(data) {
    const duplicateCheck = await db.query(
      `SELECT handle 
            FROM companies 
            WHERE handle = $1`,
      [data.handle]
    );

    if (duplicateCheck.rows[0]) {
      throw new ExpressError(
        `There already exists a company with handle '${data.handle}`,
        400
      );
    }

    const result = await db.query(
      `INSERT INTO companies 
              (handle, name, num_employees, description, logo_url)
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING handle, name, num_employees, description, logo_url`,
      [
        data.handle,
        data.name,
        data.num_employees,
        data.description,
        data.logo_url
      ]
    );

    return result.rows[0];
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain
   * all the fields; this only changes provided ones.
   *
   * Return data for changed company.
   *
   */

  static async update(handle, data) {
    let { query, values } = sqlForPartialUpdate(
      "companies",
      data,
      "handle",
      handle
    );

    const result = await db.query(query, values);
    const company = result.rows[0];

    if (!company) {
      throw new ExpressError(`There exists no company '${handle}`, 404);
    }

    return company;
  }

  /** Delete given company from database; returns undefined. */

  static async remove(handle) {
    const result = await db.query(
      `DELETE FROM companies 
          WHERE handle = $1 
          RETURNING handle`,
      [handle]
    );

    if (result.rows.length === 0) {
      throw new ExpressError(`There exists no company '${handle}`, 404);
    }
  }
}

module.exports = Company;
