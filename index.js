'use strict';
const {createPoolPromise} = require('mysql2');
const delay = require('util').promisify(setTimeout);

class DatabaseTimeout extends Error {
  constructor(operation, ms) {
    super(`Database ${operation} timed out after ${ms}ms`);
  }
}

async function timeout(operation, ms) {
  await delay(ms);
  throw new DatabaseTimeout(operation, ms);
}

function kill(connection, query) {
  connection.destroy();
  query('KILL ' + connection.escape(connection.connection.threadId));
}

function queryWithTimeout(options, getConnection, query) {
  return async (...args) => {
    const connection = await Promise.race([
      getConnection(),
      timeout('connect', options.acquireTimeout)
    ]);

    try {
      return await Promise.race([
        connection.query(...args),
        timeout('query', options.queryTimeout)
      ]);
    } catch (err) {
      if (err instanceof DatabaseTimeout) {
        kill(connection, query);
      }

      throw err;
    } finally {
      connection.release();
    }
  };
}

async function connect({
  acquireTimeout = 10000, queryTimeout = 10000, ...options
}) {
  const pool = await createPoolPromise(options);

  pool.query = queryWithTimeout(
    { acquireTimeout, queryTimeout },
    pool.getConnection.bind(pool),
    pool.query.bind(pool)
  );

  return pool;
}

module.exports = { connect };