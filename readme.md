# MySQL2 Timeout

[![7digital](https://i.imgur.com/StUnvCy.png)](http://about.7digital.com '7digital')

---

[![Travis CI](https://img.shields.io/travis/7digital/mysql2-timeout.svg?style=flat-square)](https://travis-ci.org/7digital/mysql2-timeout 'Build')
[![npm](https://img.shields.io/npm/v/@7digital/mysql2-timeout.svg?style=flat-square)](https://www.npmjs.com/package/@7digital/mysql2-timeout 'npm')
[![Node.js Version](https://img.shields.io/node/v/@7digital/mysql2-timeout.svg?style=flat-square 'Node.js Version')](#)

A wrapper for [`mysql2`] connection pool `query` to support `acquireTimeout` and `queryTimeout` options.

## Installation

```shell
npm install mysql2 @7digital/mysql2-timeout
```

## Usage

Just use this instead of `mysql2` and call `connect` passing `queryTimeout` and `acquireTimeout` millisecond values.  If not passed, each will default to 10 seconds.  All other options will be passed directly to `mysql2`.

If connection aquisition times out, a `DatabaseTimeout` error will be thrown.

If querying times out, it will
 - kill the connection
 - attempt to kill the outstanding query in the background
 - throw a `DatabaseTimeout` error

This only exposes the `mysql2` connection pool promise interface.

### Example

```javascript
const database = require('@7digital/mysql2-timeout');

async function main() {
  const db = await database.connect({
    host: 'localhost',
    user: 'root',
    database: 'test',
    queryTimeout: 5000,
    acquireTimeout: 2000
  });

  await db.query('SELECT 1');
}
```

## Developing

### `docker-compose run test`

Runs the tests once.

### `docker-compose run watch`

Runs the tests when the source or tests change.

[`mysql2`]: https://github.com/sidorares/node-mysql2