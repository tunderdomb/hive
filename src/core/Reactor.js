/* hive reactor */
var reactor = {}
module.exports = reactor

function spliceString( str, start, end, value ){
  return str.substr(0, start) + value + str.substr(start + end)
}

function ReactivePart( node, attr, start, end ){
  this.node = node
  this.attr = attr
  this.start = start
  this.end = end
  this.value = ""
  this.next = null
  this.clear()
}

ReactivePart.prototype = {
  get: function (){
    return this.value
  },
  set: function ( value ){
    if ( this.node.hasAttribute && this.node.hasAttribute(this.attr) ) {
      this.node.setAttribute(this.attr, spliceString(this.node.getAttribute(this.attr), this.start, this.end, ""))
      this.node.setAttribute(this.attr, spliceString(this.node.getAttribute(this.attr), this.start, this.start, value))
    }
    else if ( this.attr in this.node ) {
      this.node[this.attr] = spliceString(this.node[this.attr], this.start, this.end, "")
      this.node[this.attr] = spliceString(this.node[this.attr], this.start, this.start, value)
    }
    else {
      throw new Error("Invalid attribute '" + this.attr + "' on Element.")
    }
    this.end = this.start + value.length
    this.shift(value.length - this.value)
    this.value = value
  },
  /**
   * Shifting the start and end offset ensures that changing a value
   * before this on in the same node updates and maintains the integrity of offsets
   * */
  shift: function ( offset ){
    if ( !offset || !this.next ) return
    this.next.start += offset
    this.next.end += offset
    this.next.shift(offset)
  },
  clear: function (){
    if ( this.node.hasAttribute && this.node.hasAttribute(this.attr) ) {
      this.node.setAttribute(this.attr, spliceString(this.node.getAttribute(this.attr), this.start, this.end, ""))
    }
    else if ( this.attr in this.node ) {
      this.node[this.attr] = spliceString(this.node[this.attr], this.start, this.end, "")
    }
    else {
      throw new Error("Invalid attribute '" + this.attr + "' on Element.")
    }
    this.end = this.start
    this.shift(-this.value.length)
    this.value = ""
  }
}

function createReactivePart( part, reactor, dataName ){
  function getSet( newValue ){
    if ( newValue == undefined ) {
      return part.get()
    }
    else {
      part.set(newValue)
      reactor.broadcast("data" + ":" + dataName, newValue)
    }
    return newValue == undefined
      ? part.get()
      : part.set(newValue)
  }

  getSet.clear = function (){
    part.clear()
  }
  return getSet
}

/**
 * Collect template properties from a node attribute
 * This builds a chain of properties whose values will maintain
 * offset integrity among themselves.
 * */
function createReactiveAttribute( node, attr, reactor ){
  var match = true
    , prop
    , lastProp = null
    , part
  while ( match ) {
    match = node[attr].match(/{{(.+?)}}/)
    if ( match ) {
      prop = match[1]
//        prop = values[prop] = new ReactivePart(node, attr, match.index, match[0].length)
      part = new ReactivePart(node, attr, match.index, match[0].length)
      prop = reactor[prop] = createReactivePart(part, reactor, prop)
      // setting the next link retroactively
      // changing properties only affect the right side of an attribute
      // setting "hello name" to "hello John" leaves "hello " untouched thus a singly linked list
      // and links only need to know what's after them to be able to maintain indexing
      if ( lastProp ) lastProp.next = prop
      lastProp = prop
    }
  }
  return reactor
}

function createGetterSetter( dataName, element, attribute, reactor ){
  var getSet
  if ( element.hasAttribute && element.hasAttribute(attribute) ) {
    getSet = function ( newValue ){
      if ( newValue == undefined ) {
        return element.getAttribute(attribute, newValue)
      }
      else {
        element.setAttribute(attribute, newValue)
        reactor.broadcast("data" + ":" + dataName, newValue)
      }
    }
    getSet.clear = function (){
      element.setAttribute(attribute, "")
    }
  }
  else if ( attribute in element ) {
    getSet = function ( newValue ){
      if ( newValue == undefined ) {
        return element[attribute]
      }
      else {
        element[attribute] = newValue
        reactor.broadcast("data" + ":" + dataName, newValue)
      }
    }
    getSet.clear = function (){
      element[attribute] = ""
    }
  }
  return getSet
}

function setupReactiveElement( element, reactor ){
  element.attributes.forEach(function ( attr ){
    createReactiveAttribute(attr, "value", reactor)
  })
  createReactiveAttribute(element, "textContent", reactor)
  return reactor
}

reactor.createGetterSetter = createGetterSetter
reactor.setupReactiveElement = setupReactiveElement
reactor.createReactiveAttribute = createReactiveAttribute