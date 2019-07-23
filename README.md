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

router.post(path, validate(rules, opts), ...)
```

__Options__

`rules` is an object specifying the fields and their validation rules.

* Each key is a field name in the post data (e.g. 'name', 'user.name') with optional search scopes: `header` (alias `headers`), `query`, `body` and `params`. Field name and scopes are separated by `:`. If no scope is specified, **all** scopes are searched.

* Value is a rule array with the last element being an error message. A rule can be any of the [supported methods](https://github.com/chriso/validator.js#validators) of node-validator or a custom validator `function(value: *, ...args: Array<*>, ctx: KoaContext): Promise<boolean>|boolean`. `value` is the value to be validated from one of the scopes. `args` are additional arguments that can be declared for the validator (see the `isLength` example above). `ctx` is the [Koa context](https://github.com/koajs/koa/blob/master/docs/api/context.md).

If a field has no value, it won't be validated. To make a field required, add the special `required` rule (or its alias `isRequired`). If there are validation failures, the middleware invokes `ctx.throw()` with status code `400` and all error messages.

`opts` is an object specifying the options. By default, `opts = {}`. At this time we support one option:
```js
opts = {searchScopeDisabled: true}
```
This will ignore to search scopes that are separated by the `:` separator. The field name will contain `:` and all scopes will be searched.

__Examples__

```js
import validator from 'validator'

// Add custom validator
validator['validateUserName'] = async (username, group, ctx) => {
  // 1st arg (username): the value to be validate
  // 2nd...2nd-to-last args (group): the extra value passed to validateUserName, i.e. "devs"
  // last arg (ctx): the Koa context
  return boolean | Promise<boolean>
}

validate({
  // Find email from request.body and validate
  'email:body': ['require', 'isEmail', 'Invalid email address'],

  // Find password in all scopes, use the first non-empty value to validate
  'password': ['require', 'Password is required'],

  // Find birthday from request.query or request.body
  'birthday:query:body': ['isDate', 'Invalid birthday'],

  // Find username in all scopes
  'username': ['validateUserName("devs")', 'Invalid username'],
})

validate({
  // Find appium:deviceName from all scopes
  'appium:deviceName': ['require', 'Invalid device name']
}, {searchScopeDisabled: true})
```

__Route decorators__

You can combine this middleware with [route decorators](https://github.com/buunguyen/route-decorators), for example:

```js
import validate from 'koa-req-validator'
import bodyParser from 'koa-bodyparser'

@controller('/users', convert(bodyParser()))
export default class extends Ctrl {

  @post('', validate(rules))
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
