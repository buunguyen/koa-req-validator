import validator from 'validator'

const REGEXP = /(.*)\((.*)\)/
const SCOPES = ['query', 'body', 'params']

export default function validate(rules) {
  return function *(next) {
    const ctx = this
    const errors = []

    Object.keys(rules).forEach((field) => {
      const fieldRules = rules[field]
      const fieldValue = getFieldValue(ctx, field)
      const message = fieldRules[fieldRules.length - 1]
      const checks = fieldRules.slice(0, -1)

      for (let check of checks) {
        if (!runCheck(check, fieldValue)) {
          errors.push(message)
          break
        }
      }
    })

    if (errors.length) {
      ctx.throw(errors.join('; '), 400)
    }
    else if (next) {
      yield next
    }
  }

  function runCheck(check, value) {
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

    return validator[check](...args)
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

      const value = scope === 'query'
        ? ctx.request.query[name]
        : scope === 'body'
        ? ctx.request.body[name]
        : ctx.params[name]

      if (value != null) {
        return value
      }
    }
  }

  function isNullOrEmpty(str) {
    return str == null || str === '' || (typeof str === 'string' && str.trim() === '')
  }
}
