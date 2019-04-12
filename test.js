'use strict';
const {assert} = require('chai');
const delay = require('util').promisify(setTimeout);

describe('database', () => {
  let database, db;

  beforeEach(() => {
    delete require.cache[require.resolve('.')];
    database = require('.');
    db = undefined;
  });

  afterEach(function () {
    this.timeout(10000);
    if (db) { return db.end(); }
  });

  describe('when the connection times out', () => {
    let queryError, badDbServer, queryDuration;
    const connectTimeout = 500;

    beforeEach(async () => {
      badDbServer = require('net').createServer().listen(3306);

      db = await database.connect({ connectTimeout });

      const start = new Date();
      try { await db.query('SELECT 1'); }
      catch (e) { queryError = e; }
      queryDuration = new Date() - start;
    });

    afterEach(() => badDbServer.close());

    it('errors', async () => {
      assert(queryError, 'query didn\'t error');
      assert.equal(queryError.message, 'connect ETIMEDOUT');

      assert.isAtLeast(queryDuration, connectTimeout);
      assert.isAtMost(queryDuration, connectTimeout + 100); // 100ms grace
    });
  });

  describe('when the query times out', () => {
    let queryError, queryDuration;
    const queryTimeout = 500;

    beforeEach(async () => {
      db = await database.connect({
        host: 'test-db',
        user: 'root',
        connectionLimit: 1,
        queryTimeout
      });

      const start = new Date();
      try { await db.query('DO SLEEP(5) -- timeout please'); }
      catch (e) { queryError = e; }
      queryDuration = new Date() - start;
      await delay(250); // Give some time for fire-and-forget actions to finish
    });

    it('errors', () => {
      assert(queryError, 'query didn\'t error');
      assert.equal(queryError.message, 'Database query timed out after 500ms');

      assert.isAtLeast(queryDuration, queryTimeout);
      assert.isAtMost(queryDuration, queryTimeout + 100); // 100ms grace
    });

    it('kills the query', async () => {
      const [queries] = await db.query('SHOW PROCESSLIST');
      const isRunning = queries.some(q => /timeout please/.test(q.Info));
      assert.isFalse(isRunning, 'query still running');
    });

    it('frees-up the connection', async () => {
      assert.isDefined(await db.query('SELECT 1'));
    });
  });

  describe('when all connections are in use', () => {
    let queryError, queryDuration;
    const acquireTimeout = 500;

    beforeEach(async () => {
      db = await database.connect({
        host: 'test-db',
        user: 'root',
        queryTimeout: 10000,
        acquireTimeout,
        connectionLimit: 1
      });

      db.query('DO SLEEP(5)'); // Hog the only available connection

      const start = new Date();
      try { await db.query('SELECT 1'); }
      catch (e) { queryError = e; }
      queryDuration = new Date() - start;
    });

    it('times out', async () => {
      assert(queryError, 'query didn\'t error');
      assert.equal(queryError.message, 'Database connect timed out after 500ms');

      assert.isAtLeast(queryDuration, acquireTimeout - 1); // Sometimes comes in early?!
      assert.isAtMost(queryDuration, acquireTimeout + 100); // 100ms grace
    });
  });

  it('reuses connections', async () => {
    db = await database.connect({
      host: 'test-db',
      user: 'root',
      connectionLimit: 1
    });

    await db.query('SELECT 1');
    const results = await db.query('SELECT 2');
    assert.isDefined(results);
  });
});