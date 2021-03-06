var request = require('supertest')
var koa = require('koa')
var urllib = require('urllib')

var qs = require('..')

describe('Koa Querystring', function () {
  it('should work with extended mode by default', function (done) {
    var app = qs(koa())

    app.use(function* (next) {
      try {
        yield* next
      } catch (err) {
        console.error(err.stack)
      }
    })

    app.use(function* () {
      this.query.should.eql({
        a: ['1', '2', '3']
      })
      this.query = {
        a: [1, 2]
      }
      this.query.should.eql({
        a: ['1', '2']
      })
      this.querystring = 'a[0]=1&a[1]=2&a[2]=3'
      this.query.should.eql({
        a: ['1', '2', '3']
      })

      this.status = 204
    })

    request(app.listen())
    .get('/?a[0]=1&a[1]=2&a[2]=3')
    .expect(204, done)
  })

  describe('strict mode: array item', function () {
    var app = qs(koa(), 'strict')

    app.use(function* () {
      this.body = this.query;
    })

    var host
    before(function (done) {
      app.listen(0, function () {
        host = 'http://localhost:' + this.address().port
        done()
      })
    })

    it('should return the query params array', function (done) {
      urllib.request(host + '/foo?p=a,b&p=b,c&empty=&empty=&empty=&n=1&n=2&n=1&ok=true', {
        dataType: 'json'
      }, function (err, body, res) {
        res.statusCode.should.equal(200)
        body.should.eql(
          {
            p: ['a,b', 'b,c'],
            empty: ['', '', ''],
            n: ['1', '2', '1'],
            ok: ['true']
          }
        )
        done(err)
      })
    })

    it('should return empty query', function (done) {
      urllib.request(host, {
        dataType: 'json'
      }, function (err, body, res) {
        res.statusCode.should.equal(200)
        body.should.eql({})
        done(err)
      })
    })
  })

  describe('first mode: first string item', function () {
    var app = qs(koa(), 'first')

    app.use(function* () {
      this.body = this.query;
    })

    var host
    before(function (done) {
      app.listen(0, function () {
        host = 'http://localhost:' + this.address().port
        done()
      })
    })

    it('should return the first query params string', function (done) {
      urllib.request(host + '/foo?p=a,b&p=b,c&empty=&empty=&empty=&n=1&n=2&n=1&ok=true', {
        dataType: 'json'
      }, function (err, body, res) {
        res.statusCode.should.equal(200)
        body.should.eql(
          {
            p: 'a,b',
            empty: '',
            n: '1',
            ok: 'true'
          }
        )
        done(err)
      })
    })
  })

  describe('custom qs options', function () {
    it('should correctly parse numbers and booleans', function (done) {
      var app = qs(koa(), null, {
        decoder: function (str) {
          switch (str) {
            case 'true': return true;
            case 'false': return false;
            case 'null': return null;
          }

          if (/^[\d.]+$/.test(str)) {
            return Number(str);
          }

          return str;
        }
      })

      app.use(function* (next) {
        try {
          yield* next
        } catch (err) {
          console.error(err.stack)
        }
      })

      app.use(function* () {
        this.body = this.query;
      })

      request(app.listen())
        .get('/?a=str&b=1&c=3.1415&d=true&e=false&f=null&g=2.7182e')
        .expect(function (res) {
          res.body.should.eql({
            a: 'str',
            b: 1,
            c: 3.1415,
            d: true,
            e: false,
            f: null,
            g: '2.7182e',
          })
        })
        .expect(200, done);
    })
  })
})
