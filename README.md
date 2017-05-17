## koa-req-validator

[![NPM](https://nodei.co/npm/koa-req-validator.png?compact=true)](https://www.npmjs.com/package/koa-req-validator)

[![Build Status](https://travis-ci.org/buunguyen/koa-req-validator.svg?branch=master)](https://travis-ci.org/buunguyen/koa-req-validator)

A [node-validator](https://github.com/chriso/validator.js) based request validation middleware for Koa. Unlike other libraries, this middleware provides a declarative API and enables access to the full power of node-validator. Here is a taste of it:

```js
router.post('/users', validate({
    email: ['require', 'isEmail', 'Invalid email address'],
    password: ['require', 'isLength(6, 32)', 'Password must be between 6 and 32 characters']
  }), function *(next) {
     ...
  }
)

// To validate properties of an object
router.post('/users', validate({
    'user.name': ['require', 'Name is required'],
    'user.address.state': ['require', 'State is required']
  }), function *(next) {
    ...
  }
)
```

### Usage

__Basic__

```js
import validate from 'koa-req-validator'

router.post(path, validate(opts), ...)
```

__Options__

`opts` is an object specifying the fields and their corresponding validation rules.

* Each key is a field name in the post data (e.g. 'name', 'user.name') with optional search scopes: `query`, `body` and `params`. Field name and scopes are separated by `:`. If no scope is specified, all scopes are searched.

* Value is a rule array with the final element being an error message. A rule can be any of the [supported methods](https://github.com/chriso/validator.js#validators) of node-validator or a custom sync/async validator `fn(value, ...args)`. Arguments can be provided, but make sure the omit the `str` argument (the first one) as it is automatically supplied by the middleware.

If a field has no value, it won't be validated. To make a field required, add the special `required` rule (or its alias `isRequired`). If there are validation failures, the middleware invokes `ctx.throw()` with status code 400 and all error messages.

__Examples__

```js
validate({
  // Only find and validate email from request.body
  'email:body': ['require', 'isEmail', 'Invalid email address'],

  // Find password in all scopes, use the first non-empty value to validate
  'password': ['require', 'Password is required'],

  // Find and validate birthday from request.query or request.body
  'birthday:query:body': ['isDate', 'Invalid birthday'],

  // Check user name exist
  'username': ['isUserNameNew', 'Username already exists']
})

async function isUserNameNew(username) {
    return await db.Users.isNew(username) // return a Promise
}
```

__Route decorators__

You can combine this middleware with [route decorators](https://github.com/buunguyen/route-decorators), for example:

```js
import validate from 'koa-req-validator'
import bodyParser from 'koa-bodyparser'

@controller('/users', convert(bodyParser()))
export default class extends Ctrl {

  @post('', validate(opts))
  async register(ctx, next) {
    ...
  }
}
```

### Test

```bash
npm install
npm test
```
