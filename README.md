## koa-req-validator

[![NPM](https://nodei.co/npm/koa-req-validator.png?compact=true)](https://www.npmjs.com/package/koa-req-validator)

[![Build Status](https://travis-ci.org/buunguyen/koa-req-validator.svg?branch=master)](https://travis-ci.org/buunguyen/koa-req-validator)

A [node-validator](https://github.com/chriso/validator.js)-based request validation middleware for Koa. This middleware takes a declarative approach to validation, unlike existing validation libraries. Here is a taste of it:

```js
router.post(
  '/users',
  validate({
    email: ['require', 'isEmail', 'Invalid email address'],
    password: ['require', 'isLength(6, 32)', 'Password must be between 6 and 32 characters']
  }),
  function *(next) { ... }
)
```

### Usage

__Basic__

```js
import validate from 'koa-req-validator'

router.post(path, validate(opts), ...)
```

__Options__

`opts` is an object specifying fields and their corresponding validation rules.

* Each key is a field name with optional search scopes: `query`, `body` and `params`, all separated by `:`. If no scope is specified, all scopes are searched.

* Value is an array of rules with the final element being an error message. A rule is a [supported method](https://github.com/chriso/validator.js#validators) of node-validator, except no need to add the first `str` argument.

By default, no validation is performed unless a field has value. To make a field required, add the special `required` rule (or its alias `isRequired`).

If validation fails, the middleware invokes `ctx.throw()` with status code 400 and all validation errors.

__Examples__

```js
validate({
  // Only find and validate email from request.body
  'email:body': ['require', 'isEmail', 'Invalid email address'],

  // Find password in all scopes, use the first non-empty value to validate
  'password': ['require', 'Password is required'],

  // Find and validate birthday from request.query or request.body
  'birthday:query:body': ['isDate', 'Invalid birthday']
})
```
__Koa 2 Support__

To use the middleware with [Koa 2](https://github.com/koajs/koa/tree/v2.x), you must first convert it to a Koa 2 middleware using (koa-convert)[https://github.com/gyson/koa-convert].

```js
import convert from 'koa-convert'
import validate from 'koa-req-validator'

router.post(path, convert(validate(opts)), ...)
```

You can also create a helper function to facilitate reuse:

```js
import convert from 'koa-convert'
import _validate from 'koa-req-validator'

const validate = (...args) => convert(_validate(...args))
```

__Route decorators__

You can combine this middleware with [route decorators](https://github.com/buunguyen/route-decorators), for example:

```js
import convert from 'koa-convert'
import validate from 'koa-req-validator'
import bodyParser from 'koa-bodyparser'

@controller('/users', convert(bodyParser()))
export default class extends Ctrl {

  @post('', convert(validate(opts)))
  async register(ctx, next) {
    ...
  }
```

### Test

```bash
npm install
npm test
```
