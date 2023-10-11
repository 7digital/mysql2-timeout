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

async function getConnectionWithTimeout(getConnection, timeoutMs) {
  const gettingConnection = getConnection();
  try {
    return await Promise.race([
      gettingConnection,
      timeout('connect', timeoutMs)
    ]);
  } catch (err) {
    gettingConnection.then(conn => conn.release()).catch(() => {});
    throw err;
  }
}

function queryWithTimeout(options, getConnection, query) {
  return async (firstArg, ...otherArgs) => {

    const connection = await getConnectionWithTimeout(getConnection, options.acquireTimeout);

    let queryTimeout = options.defaultQueryTimeout;
    if (typeof firstArg === 'object') {
      ({ timeout: queryTimeout, ...firstArg } = firstArg);
    }

    try {
      return await Promise.race([
        connection.query(firstArg, ...otherArgs),
        timeout('query', queryTimeout)
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
  acquireTimeout = 10000, defaultQueryTimeout = 10000, ...options
}) {
  const pool = await createPoolPromise(options);

  pool.query = queryWithTimeout(
    { acquireTimeout, defaultQueryTimeout },
    pool.getConnection.bind(pool),
    pool.query.bind(pool)
  );

  return pool;
}

module.exports = { connect };
