# MySQL2 Timeout

[![7digital](https://i.imgur.com/StUnvCy.png)](https://www.7digital.com)

---

[![Test](https://github.com/7digital/mysql2-timeout/actions/workflows/test.yml/badge.svg)](https://github.com/7digital/mysql2-timeout/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/@7digital/mysql2-timeout.svg?style=flat-square)](https://www.npmjs.com/package/@7digital/mysql2-timeout 'npm')
[![Node.js Version](https://img.shields.io/node/v/@7digital/mysql2-timeout.svg?style=flat-square 'Node.js Version')](#)

A wrapper for [`mysql2`] connection pool `query` to support connection acquiring and query timeout options.

## Installation

```shell
npm install mysql2 @7digital/mysql2-timeout
```

## Usage

Just use this instead of `mysql2` and call `connect` passing `acquireTimeout` and `defaultQueryTimeout` millisecond values.  If not passed, each will default to 10 seconds. All other options will be passed directly to `mysql2`.

If connection aquisition times out, a `DatabaseTimeout` error will be thrown.

If querying times out, it will
 - kill the connection
 - attempt to kill the outstanding query in the background
 - throw a `DatabaseTimeout` error

You can override the default query timeout on a per-query basis by specifying `timeout` when calling `query` with an object.

This only exposes the `mysql2` connection pool promise interface.

### Example

```javascript
const database = require('@7digital/mysql2-timeout');

async function main() {
  const db = await database.connect({
    host: 'localhost',
    user: 'root',
    database: 'test',
    acquireTimeout: 2000,
    defaultQueryTimeout: 5000
  });

  await db.query('SELECT 1');

  await db.query({ sql: 'SELECT 2', timeout: 1000 });
}
```

## Developing

Requirements:
 - Node.js (see [package.json](./package.json) for version)
 - Docker
 - Docker Compose

### `make test`

Spins up database and test containers, runs the tests once, and then stops the containers.

### `make watch`

Spins up database and test containers, and runs the tests whenever the source or tests change.

[`mysql2`]: https://github.com/sidorares/node-mysql2
