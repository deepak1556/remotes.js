var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits

module.exports = Remotes

inherits(Remotes, EventEmitter)

Remotes.remote =
Remotes.Remote = require('./remote')

// name of the remotes
Remotes.remotes = []

Remotes.local =
Remotes.Local = require('./remotes/local')
Remotes.remotes.push('local')

Remotes.github =
Remotes.Github =
Remotes.GitHub = require('./remotes/github')
Remotes.remotes.push('github')

function Remotes(remotes, options) {
  if (!(this instanceof Remotes))
    return new Remotes(remotes, options)

  if (Array.isArray(remotes)) {
    options = options || {}
  } else {
    options = remotes || {}
    remotes = null
  }

  // list of remotes
  this.remotes = []
  // look up remotes by `remote.name`
  this.remote = Object.create(null)

  if (remotes) remotes.forEach(function (remote) {
    var Remote = Remotes[remote]
    if (!Remote) throw new Error('no remote by the name of "' + remote + '"')
    this.use(new Remote(options))
  }, this)
}

/**
 * Use a remote. At least one is required.
 * Must inherit from `Remote`.
 *
 * @param {Object} remote
 * @api public
 */

Remotes.prototype.use = function (remote) {
  if (!(remote instanceof Remotes.Remote))
    throw new TypeError('You may only use .Remote\'s')

  this.remotes.push(remote)
  this.remote[remote.name] = remote

  var self = this
  // proxy messages
  remote.on('warning', function (msg) {
    self.emit('warning', msg)
  })
  remote.on('suggestion', function (msg) {
    self.emit('suggestion', msg)
  })

  return this;
}

/**
 * Resolve a component from [remotes].
 * Internally, this will just look up the `component.json`.
 * Returns the remote instance if there's a match, otherwise null.
 * If there's only one remote, then it'll just return that remote.
 *
 * @param {Array} remotes
 * @param {String} component name
 * @param {String} component reference
 * @return {Object} remote
 * @api public
 */

Remotes.prototype.resolve = function* (remotes, name, reference) {
  var length = this.remotes.length
  if (!length) throw new Error('no remotes')

  // resolve(name, [reference])
  if (typeof remotes === 'string') {
    reference = name
    name = remotes
    remotes = this.remotes.map(toName)
  }

  // map to remote instances
  var instances = remotes.map(function (name) {
    return this.remote[name]
  }, this).filter(Boolean)
  remotes = instances.map(toName);

  // loop through
  for (var i = 0; i < instances.length; i++)
    if (yield* instances[i].resolve(remotes, name, reference))
      return instances[i]
}

function toName(x) {
  return x.name
}