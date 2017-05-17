import validator from 'validator'

const REGEXP = /(.*)\((.*)\)/
const SCOPES = ['params', 'query', 'body']

export default function validate(rules) {
  return async (ctx, next) => {
    const errors = []

    for (let field of Object.keys(rules)) {
      const fieldRules = rules[field]
      const fieldValue = getFieldValue(ctx, field)
      const message = fieldRules[fieldRules.length - 1]
      const checks = fieldRules.slice(0, -1)

      for (let check of checks) {
        const isValid = await runCheck(check, fieldValue)
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

  async function runCheck(check, value) {
    const args = [value]
    const match = check.match(REGEXP)

    if (match) {
      check = match[1]
      match[2].split(',')
        .map((v) => JSON.parse(v))
        .forEach((v) => args.push(v))
    }

    // Treats null-empthy specially: ok unless require or isRequired is specified
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

    return await validator[check](...args)
  }

  function getFieldValue(ctx, field) {
    let [name, ...scopes] = field.split(':')

    if (scopes.length === 0) {
      scopes = SCOPES
    }

    for (let scope of scopes) {
      if (!~SCOPES.indexOf(scope)) {
        throw new Error(`Invalid scope, must be one of ${SCOPES.join(', ')}`)
      }

      const value = scope === 'params'
        ? getValueByPath(ctx.params, name)
        : scope === 'query'
          ? getValueByPath(ctx.request.query, name)
          : (ctx.request.body && getValueByPath(ctx.request.body, name))

      if (value != null) {
        return value
      }
    }
  }

  function getValueByPath(obj, path) {
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
