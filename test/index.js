import 'babel-polyfill'
import {assert} from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

describe('validate', () => {
  const validator = {
    check1() {},
    check2() {}
  }

  const validate = proxyquire('../src', {validator}).default
  const createContext = ({query = {}, body = {}, params = {}}) => {
    return {
      params,
      request: {query, body},
      throw(msg, status) {
        const error = new Error(msg)
        error.status = status
        throw error
      }
    }
  }

  it('should invoke checks with correct arguments', async () => {
    const mock = sinon.mock(validator)
    mock.expects('check1').withArgs('value').once().returns(true)
    mock.expects('check2').withArgs('value', 1, '2').once().returns(true)

    const middleware = validate({
      field: ['check1', 'check2(1, "2")', 'message']
    })

    await middleware.call(createContext({
      params: {
        field: 'value'
      }
    })).next()
    mock.verify()
  })

  it('should throw if require|isRequired check exists but value is null or empty', async () => {
    const middleware = validate({
      field1: ['require', 'message1'],
      field2: ['isRequired', 'message2']
    })

    try {
      await middleware.call(createContext({
        params: {
          field1: null,
          field2: ''
        }
      })).next()
      assert.fail()
    }
    catch (err) {
      assert.equal(err.message, 'message1; message2')
      assert.equal(err.status, 400)
    }
  })

  it('should search only in the specified scopes', async () => {
    const middleware = validate({
      'field1:query:params': ['require', 'message1']
    })

    try {
      await middleware.call(createContext({
        body: {
          field1: 'value'
        }
      })).next()
      assert.fail()
    }
    catch (err) {
      assert.equal(err.message, 'message1')
    }
  })
})
