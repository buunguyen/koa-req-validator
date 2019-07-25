import validator from 'validator'

const FN_REGEXP = /(.*)\((.*)\)/
const ARGS_REGEXP = /(?:[^,"']+|"[^"]*?"|'[^']*?')+/g
const SCOPES = ['params', 'query', 'body', 'header', 'headers']

export default function validate(rules, opts = {}) {
  const defaultOpts = {searchScopeEnabled: true}
  const optWithDefault = Object.assign(defaultOpts, opts)

  return async (ctx, next) => {
    const errors = []

    for (let field of Object.keys(rules)) {
      const fieldRules = rules[field]
      const fieldValue = getFieldValue(ctx, field, optWithDefault)
      const message = fieldRules[fieldRules.length - 1]
      const checks = fieldRules.slice(0, -1)

      for (let check of checks) {
        const isValid = await runCheck(check, fieldValue, ctx)
        if (!isValid) {
          errors.push(message)
          break
        }
      }
    }

    if (errors.length) {
      ctx.throw(errors.join('; '), 400)
    }
    else if (next) {
      await next()
    }
  }

  async function runCheck(check, value, ctx) {
    const args = [value]
    const match = check.match(FN_REGEXP)

    if (match) {
      check = match[1]
      match[2].match(ARGS_REGEXP)
        .map((v) => JSON.parse(v))
        .forEach((v) => args.push(v))
    }

    // Treats null/empty specially: ok unless `require` or `isRequired` is specified
    const hasNoValue = isNullOrEmpty(value)
    if (~['require', 'isRequired'].indexOf(check)) {
      return !hasNoValue
    }
    else if (hasNoValue) {
      return true
    }

    if (!validator[check]) {
      throw new Error(`Rule '${check}' does not exist`)
    }

    // Add the Koa ctx as the last argument
    args.push(ctx)

    return await validator[check](...args)
  }

  function getFieldValue(ctx, field, opts = {}) {
    const {searchScopeEnabled} = opts
    let [path, ...scopes] = searchScopeEnabled ? field.split(':') : [field]

    if (scopes.length === 0) {
      scopes = SCOPES
    }

    for (let scope of scopes) {
      if (!~SCOPES.indexOf(scope)) {
        throw new Error(`Invalid scope, must be one of ${SCOPES.join(', ')}`)
      }

      const data = ctx[scope] || ctx.request[scope]

      const value = getValueAtPath(data, path)

      if (value != null) {
        return value
      }
    }
  }

  function getValueAtPath(obj, path) {
    return path.indexOf('.') === -1
            ? obj[path]
            : path.split('.').reduce((res, prop) => isObject(res) ? res[prop] : undefined, obj)
  }

  function isObject(obj) {
    return Object.prototype.toString.call(obj) === '[object Object]'
  }

  function isNullOrEmpty(str) {
    return str == null || str === '' || (typeof str === 'string' && str.trim() === '')
  }

}
