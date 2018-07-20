import 'babel-polyfill'
import {assert} from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

describe('validate', () => {
  const validator = {
    check1() {},
    check2() {},
    async check3(v, arg) {
      return await new Promise(resolve => setTimeout(() => resolve(arg === 'true')), 2000)
    }
  }

  const validate = proxyquire('../src', {validator}).default
  const createContext = ({query = {}, body = {}, params = {}, header = {}, headers = {}}) => {
    return {
      params,
      request: {query, body, header, headers},
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

    await middleware(createContext({
      params: {
        field: 'value'
      }
    }))
    mock.verify()
  })

  it('should deal with regexp separator', async () => {
    const mock = sinon.mock(validator)
    mock.expects('check1').withArgs('value', 1, '^[a-z]{0,6}$', '3', 4).once().returns(true)

    const middleware = validate({field: ['check1(1, "^[a-z]{0,6}$", "3", 4)', 'message']})

    await middleware(createContext({params: {field: 'value'}}))
    mock.verify()
  })

  it('should invoke checks for nested path', async () => {
    const mock = sinon.mock(validator)
    mock.expects('check1').withArgs('value').twice().returns(true)
    mock.expects('check2').withArgs('value', 1, '2').twice().returns(true)

    const middleware = validate({
      'field1.level1': ['check1', 'check2(1, "2")', 'message1'],
      'field2.level1.level2': ['check1', 'check2(1, "2")', 'message2']
    })

    await middleware(createContext({
      params: {
        field1: {
          level1: 'value'
        },
        field2: {
          level1: {
            level2: 'value'
          }
        }
      }
    }))
    mock.verify()
  })

  it('should throw if require|isRequired check exists but value is null or empty', async () => {
    const middleware = validate({
      field1: ['require', 'message1'],
      field2: ['isRequired', 'message2'],
      'field3.level1': ['require', 'message3']
    })

    try {
      await middleware(createContext({
        body: {
          field1: null,
          field2: '',
          field3: {
            level1: null
          }
        }
      }))
      assert.fail()
    }
    catch (err) {
      assert.equal(err.message, 'message1; message2; message3')
      assert.equal(err.status, 400)
    }
  })

  it('should throw if async validator check invalid value', async () => {
    const middleware = validate({
      field1: ['check3("true")', 'no message'],
      field2: ['check3("false")', 'message2'],
      field3: ['check3("true")','isLength(0,3)', 'message3']
    })

    try {
      await middleware(createContext({
        body: {
          field1: 'value1',
          field2: 'value2',
          field3: 'longvalue'
        }
      }))
      assert.fail()
    }
    catch (err) {
      assert.equal(err.message, 'message2; message3')
      assert.equal(err.status, 400)
    }
  })

  it('should search only in the specified scopes', async () => {
    const middleware = validate({
      'field1:query:params:header:headers': ['require', 'message1']
    })

    try {
      await middleware(createContext({
        body: {
          field1: 'value'
        }
      }))
      assert.fail()
    }
    catch (err) {
      assert.equal(err.message, 'message1')
    }
  })
})
