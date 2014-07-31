/* hive.Radio */

module.exports = Radio

function Radio(){}

var proto = Radio.prototype = {}
proto.listen = listen
proto.unListen = unListen
proto.broadcast = broadcast
proto.listenOnce = once
proto.hasListener = hasListener

function listen( channel, listener ){
  this.channels = this.channels || {};
  (this.channels[channel] = this.channels[channel] || []).push(listener)
  return this
}

function unListen( channel, listener ){
  if ( !channel ) {
    this.channels = {}
  }
  else if ( !listener ) {
    this.channels[channel] = []
  }
  else {
    channel = this.channels[channel]
    if ( channel ) {
      var i = channel.indexOf(listener)
      if ( ~i ) {
        channel.splice(i, 1)
      }
    }
  }
  return this
}

function broadcast( channel, message ){
  message = [].slice.call(arguments, 1)
  channel = this.channels[channel]
  if ( channel ) {
    channel.forEach(function ( listener ){
      listener.apply(this, message)
    }, this)
  }
  return this
}

function once( channel, listener ){
  function proxy(){
    unListen.call(this, channel, proxy)
    listener.apply(this, arguments)
  }

  listen.call(this, channel, proxy)
  return this
}

function hasListener( channel, listener ){
  return channel = this.channels[channel]
    ? listener ? !!~channel.indexOf(listener) : true
    : false
}
