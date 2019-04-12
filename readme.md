# MySQL2 Timeout

A wrapper for [`mysql2`] connection pool `query` to support `acquireTimeout` and `queryTimeout` options.

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
const database = require('.');

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