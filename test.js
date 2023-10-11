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

  describe('when the default query timeout is reached', () => {
    let queryError, queryDuration;
    const defaultQueryTimeout = 500;

    beforeEach(async () => {
      db = await database.connect({
        host: 'test-db',
        user: 'root',
        connectionLimit: 1,
        defaultQueryTimeout
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

      assert.isAtLeast(queryDuration, defaultQueryTimeout);
      assert.isAtMost(queryDuration, defaultQueryTimeout + 100); // 100ms grace
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

  describe('when the query timeout override is reached', () => {
    let queryError, queryDuration;
    const timeout = 500;

    beforeEach(async () => {
      db = await database.connect({
        host: 'test-db',
        user: 'root',
        connectionLimit: 1,
        defaultQueryTimeout: 100
      });

      const start = new Date();
      try {
        await db.query({ sql: 'DO SLEEP(5) -- timeout please', timeout });
      }
      catch (e) { queryError = e; }
      queryDuration = new Date() - start;
      await delay(250); // Give some time for fire-and-forget actions to finish
    });

    it('errors', () => {
      assert(queryError, 'query didn\'t error');
      assert.equal(queryError.message, 'Database query timed out after 500ms');

      assert.isAtLeast(queryDuration, timeout);
      assert.isAtMost(queryDuration, timeout + 100); // 100ms grace
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

  describe('when querying while all connections are in use', () => {
    let queryError, queryDuration, connectionHog, queuedQuery;
    const acquireTimeout = 500;

    beforeEach(async () => {
      db = await database.connect({
        host: 'test-db',
        user: 'root',
        defaultQueryTimeout: 10000,
        acquireTimeout,
        connectionLimit: 1
      });

      connectionHog = db.query('DO SLEEP(2)'); // Hog the only available connection

      db.once('enqueue', () => queuedQuery = true);
      const start = new Date();
      try { await db.query('SELECT 1'); } // Query while connection is hogged
      catch (e) { queryError = e; }
      queryDuration = new Date() - start;
    });

    it('times out getting a connection', () => {
      assert(queryError, 'query didn\'t error');
      assert.equal(queryError.message, 'Database connect timed out after 500ms');

      assert.isAtLeast(queryDuration, acquireTimeout - 1); // Sometimes comes in early?!
      assert.isAtMost(queryDuration, acquireTimeout + 100); // 100ms grace
    });

    it('makes the timed out connection available for use', async () => {
      assert.isTrue(queuedQuery, 'Timed out query was not queued');
      await connectionHog;
      assert.isDefined(await db.query('SELECT 1'));
    }).timeout(5000);
  });

  describe('when acquiring the connection times out', () => {
    let queryError, badDbServer, queryDuration;
    const acquireTimeout = 500;

    beforeEach(async () => {
      badDbServer = require('net').createServer().listen(3306);

      db = await database.connect({ acquireTimeout });

      const start = new Date();
      try { await db.query('SELECT 1'); }
      catch (e) { queryError = e; }
      queryDuration = new Date() - start;
    });

    afterEach(function (done) {
      this.timeout(10000);
      if (badDbServer.listening) { badDbServer.close(done); }
      else { done(); }
    });

    it('times out', () => {
      assert(queryError, 'query didn\'t error');
      assert.equal(queryError.message, 'Database connect timed out after 500ms');

      assert.isAtLeast(queryDuration, acquireTimeout - 1); // Sometimes comes in early?!
      assert.isAtMost(queryDuration, acquireTimeout + 100); // 100ms grace
    });

    describe('when the connection then errors', () => {
      let connError;
      const unhandledError = err => connError = err;
      beforeEach(() => process.once('unhandledRejection', unhandledError));
      afterEach(() => process.off('unhandledRejection', unhandledError));

      it('swallows the connection error', done => {
        badDbServer.close(() => {
          if (connError) { assert.fail(`Did not expect an error, but got '${connError}'`); }

          done();
        });
      }).timeout(10000);
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
