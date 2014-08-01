(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* hive.App */

var util = require("../utils")
var RoleDefinition = require("./RoleDefinition")

function App( name, appDef ){
  RoleDefinition.call(this, name, appDef, null, this)
  this.options = {
    // if false, and and element doesn't have a defined role it throws an error
    allowAnonymousRoles: true,
    // controls whether to search sub roles as nested roles
    // (e.g. just panel:button kinds, or indiscriminately assign every first class role)
    anonymous: true
  }
}
util.extend(App.prototype, RoleDefinition.prototype)
util.extend(App.prototype, {
  renderAnonymousGlobalRoles: function ( appRoot ){
    var roles = util.findAny(appRoot).forEach(function( role ){

    })
  },
  renderApp: function ( root ){
    var appRoot = util.contains(root, this.name)
      ? root
      : util.find(this.name, root)

    if ( !appRoot ) {
      throw new Error("Missing defined app role '" + this.name + "' from " + root.tagName)
    }

    var appRole = this.create(appRoot, null, null)
//    this.renderAnonymousGlobalRoles(appRoot)
    return appRole
  },
  cleanup: function (){
    // clean up circular references
    this.base.destroy()
  },
  start: function ( callback ){
    callback = callback || function ( app ){}
    function start(){
      var rendered = this.renderApp(document.body)
//        this.broadcast("start", rendered)
      callback(rendered)
    }

    if ( document.body ) {
      start.bind(this)()
    }
    else {
      addEventListener("DOMContentLoaded", start.bind(this))
    }
  }
})

module.exports = App
},{"../utils":24,"./RoleDefinition":6}],2:[function(require,module,exports){
/* hive.Binding */

var util = require("../utils")

function isInput( element ){
  switch ( element.tagName ) {
    case "INPUT":
    case "SELECT":
    case "TEXTAREA":
      return true
    default:
      return false
  }
}

/**
 * @example
 *
 * Binding( "data-something", "", "dataObject.dataField", role )
 * Binding( "subRoleName.value:change", "otherDataObject.otherDataField", role )
 * */
function Binding( attrAccessor, dataAccessor, role ){
  var parts = attrAccessor.split(":")
    , targetRole

  var eventName = parts.length == 1 ? "change" : parts.pop()
  parts = parts[0].split(".")

  // getting an element and an attribute
  this.attribute = parts.pop()
  targetRole = util.accessProperty(parts, role)
  if ( !targetRole ) {
    throw new Error("Couldn't access property with '" + attrAccessor + "'")
  }
  this.roleElement = targetRole.element

  // getting data object and data field name
  parts = dataAccessor.split(".")
  var fieldName = parts.pop()
  var dataObject = util.accessProperty(parts, role.data)
  if ( !dataObject ) {
    throw new Error("Couldn't find data set with '" + dataAccessor + "'")
  }
  this.dataAccessor = dataObject[fieldName]
  if ( !this.dataAccessor ) {
    throw new Error("Missing field '" + fieldName + "' on data set")
  }

  // setting up bindings
  role.listen(dataObject.getEventName(fieldName), this.syncElement.bind(this))
  if ( eventName && isInput(this.roleElement) && "on" + eventName in this.roleElement ) {
    targetRole.on(eventName, this.syncModel.bind(this))
  }
}
Binding.prototype = {
  // events triggered back and forth
  // this prevents them going in circles
  direction: 0,
  /**
   * Updates the element with the value from the data model
   * */
  syncElement: function (){
    if ( this.direction == 1 ) return
    this.direction = -1
    this.setElementValue(this.dataAccessor())
    this.direction = 0
  },
  /**
   * Updates the data model with the element's attribute value
   * */
  syncModel: function (){
    if ( this.direction == -1 ) return
    this.direction = 1
    this.dataAccessor(this.getValueFromElement())
    this.direction = 0
  },
  getValueFromElement: function (){
    return this.attribute in this.roleElement
      ? this.roleElement[this.attribute]
      : this.roleElement.getAttribute(this.attribute)
  },
  setElementValue: function ( value ){
    if ( this.attribute in this.roleElement ) {
      this.roleElement[this.attribute] = value
    }
    else {
      this.roleElement.setAttribute(this.attribute, value)
    }
  }
}

module.exports = Binding


},{"../utils":24}],3:[function(require,module,exports){
/* hive.DataModel */

var util = require("../utils")
var Radio = require("./Radio")

function DataSet(){}
DataSet.prototype = {
  toJSON: function (){
    return this.raw()
  },
  raw: function ( fields ){
    fields = fields || Object.keys(this)
    return fields.reduce(function ( raw, name ){
      if ( this.hasOwnProperty(name) ) raw[name] = this[name]()
      return raw
    }.bind(this), {})
  },
  stringify: function (){
    return JSON.stringify(this)
  }
}

function createAccessor( fieldName, defaultValue, customGet, customSet, reactor ){
  var value = defaultValue
  this[fieldName] = function ( newValue ){
    if ( newValue == undefined ) {
      return customGet ? customGet.call(this, value) : value
    }
    else {
      value = customSet ? customSet.call(this, newValue) : newValue
      reactor.broadcast(this.getEventName(fieldName), value)
    }
  }.bind(this)
}

util.extend(DataSet.prototype, Radio.prototype)

function DataModel( name, simpleValues, parent, app ){
  this.name = name
  this.parent = parent
  this.app = app
  this.fields = {}
  for ( var fieldName in simpleValues ) {
    this.fields[fieldName] = [fieldName, simpleValues[fieldName], null, null]
  }
  this.modelConstructor = function Data(){}
  util.extend(this.modelConstructor.prototype, DataSet.prototype)
  // used to construct event names for bindings
  this.modelConstructor.prototype.getEventName = function ( fieldName ){
    return "data:" + name + ":" + fieldName
  }
}

DataModel.prototype = {
  createDataSet: function ( hostRole ){
    var args
      , fields = this.fields
      , dataSet = new this.modelConstructor()
    for ( var fieldName in fields ) {
      args = fields[fieldName].concat(hostRole)
      createAccessor.apply(dataSet, args)
    }
    return dataSet
  },
  destroy: function (){
    delete this.parent
    delete this.app
    delete this.fields
  },
  clone: function ( parent, simpleValues ){
    var clone = new DataModel(this.name, simpleValues, parent, this.app)
    util.extend(clone.fields, this.fields)
    return clone
  },
  attr: function ( fieldName, defaultValue, customGet, customSet ){
    this.fields[fieldName] = [fieldName, defaultValue, customGet, customSet]
    return this
  }
}

},{"../utils":24,"./Radio":4}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
/* hive.Role */

var util = require("../utils")
var event = require("./event")
var Radio = require("./Radio")

module.exports = Role

function normalizeValue( value ){
  switch ( true ) {
    case value == "true":
    case value == "false":
      return Boolean(value)
    case /^(\d*[\.,])?\d+?$/.test(value):
      return parseFloat(value)
    default:
      return value
  }
}

function camelCase( str ){
  return str.replace(/-(.)/g, function ( match, group ){
    return group.toUpperCase()
  })
}

/**
 * @constructor
 * @param {String} name - the name of this role
 * @param {Element} element - the element of the role controller
 *                                  can be an options object, which will be merged with the Role instance
 * @param {Role} [parent] - the parent of this role, if exists, if not, it's a root role
 * @param {Role} app - the root of the role tree, aka the app root role
 * */
function Role( name, element, parent, app ){
  this.role = name
  this.element = element
  this.parent = parent
  this.app = app
  this.events = {}
  this.channels = {}
  this.data = {}
}

Role.extend = function ( proto ){
  util.extend(Role.prototype, proto)
}

Role.prototype = {

  removeSubRole: function ( subRole ){
    var subRoleName = subRole.role
    if ( Array.isArray(this[subRoleName]) ) {
      this[subRoleName].splice(this[subRoleName].indexOf(subRole), 1)
    }
    else {
      delete this[subRoleName]
    }
  },

  destroy: function (){
    if ( this.parent ) {
      this.parent.removeSubRole(this)
    }
    delete this.parent[this.name]
    delete this.parent
    delete this.app
    delete this.data
    delete this.element
    for ( var event in this.events ) {
      this.events[event].unListen()
    }
    delete this.events
  },
  // data-* attributes
  /**
   * returns a single property value, or an object for a property list
   * @param {String|String[]|Object} prop a single value to return
   *                                      a list of values to filter
   *                                      a prefix to extract all prefixed data attributes
   * @param {Object} [defaultValue] a value or a hash of values the result defaults to
   * */
  getData: function ( prop, defaultValue ){
    var data = {}
    if ( typeof prop == "string" ) {
      prop = this.element.getAttribute("data-" + prop)
      return prop == undefined ? defaultValue : prop
    }
    else if ( Array.isArray(prop) ) {
      var element = this.element
      if ( defaultValue ) {
        util.extend(data, defaultValue)
      }
      return prop.reduce(function ( data, attr ){
        if ( element.hasAttribute("data-" + attr) ) {
          data[attr] = element.getAttribute("data-" + attr)
        }
        return data
      }, data)
    }
    else {
      var regexp
        , attributes = [].slice.call(this.element.attributes)
      if ( defaultValue == undefined ) {
        data = util.extend({}, prop)
        regexp = new RegExp("^data-(.+?)$")
      }
      else {
        regexp = new RegExp("^data-" + prop + "-(.+?)$")
        util.extend(data, defaultValue)
      }
      return attributes.reduce(function ( data, attr ){
        var name = (attr.name.match(regexp) || [])[1]
        if ( name ) {
          data[camelCase(name)] = normalizeValue(attr.value)
        }
        return data
      }, data)
    }
  },
  /**
   * @param {String|Object} prop - value(s) to set
   * @param {*} [val] - value of this property if prop is a string
   * */
  setData: function ( prop, val ){
    if ( val != undefined && typeof prop == "string" ) {
      this.element.setAttribute("data-" + prop, val)
    }
    else for ( var name in prop ) {
      this.element.setAttribute("data-" + name, prop[name])
    }
  },
  /**
   * delete values from the data attribute space
   * @param {String|String[]} prop - data value(s) to remove
   * */
  removeData: function ( prop ){
    if ( typeof prop == "string" ) {
      this.element.removeAttribute("data-" + prop)
    }
    else {
      var element = this.element
      prop.forEach(function ( name ){
        element.removeAttribute("data-" + name)
      })
    }
  },
  isData: function ( prop, value ){
    return this.getData(prop) == value
  },

  // classList

  addClass: function ( cls ){
    this.element.classList.add(cls)
  },
  removeClass: function ( cls ){
    this.element.classList.remove(cls)
  },
  hasClass: function ( cls ){
    return this.element.classList.contains(cls)
  },
  toggleClass: function ( cls ){
    this.element.classList.toggle(cls)
  },

  extend: function ( extension ){
    return util.extend(this, extension)
  },

  // DOM events

  on: function ( type, listener, capture ){
    function hook(){
      listener.apply(role, arguments)
    }

    var args = [this.element, hook].concat([].slice.call(arguments, 2))
    var role = this
    if ( event.exists(type) ) {
      (this.events[type] || (this.events[type] = [])).push([listener, event.create(type, this, args), hook])
    }
    else {
      // on the hook
      (this.events[type] || (this.events[type] = [])).push([listener, hook])
      this.element.addEventListener(type, hook, !!capture)
    }
    return this
  },
  off: function ( type, listener, capture ){
    var role = this
    if ( !this.events[type] || !this.events[type].length ) return this
    this.events[type].some(function ( l ){
      if ( l[0] == listener ) {
        if ( event.exists(type) ) {
          // removeEventListener(hook, capture)
          l[1](l[2], !!capture)
        }
        else {
          // off the hook
          role.element.removeEventListener(type, l[1], !!capture)
        }
        return true
      }
      return false
    })
    return this
  },
  once: function ( event, listener, capture ){
    function once(){
      listener.apply(this, arguments)
      this.off(event, once, capture)
    }

    var args = [event, once].concat([].slice.call(arguments, 2))
    return this.on.apply(this, args)
  },

  // DOM manipulation

  appendChild: function ( element ){
    this.element.appendChild(element)
    return this
  },
  appendTo: function ( element ){
    element.appendChild(this.element)
    return this
  },
  prependChild: function ( element ){
    if ( this.element.firstChild ) {
      this.element.insertBefore(element, this.element.firstChild)
    }
    else {
      this.element.appendChild(element)
    }
    return this
  },
  prependTo: function ( element ){
    if ( element.firstChild ) {
      element.insertBefore(this.element, element.firstChild)
    }
    else {
      element.appendChild(this.element)
    }
    return this
  },
  replaceChild: function ( newElement, refElement ){
    this.element.replaceChild(newElement, refElement)
    return this
  },
  replaceTo: function ( child ){
    child.parentNode.replaceChild(this.element, child)
    return this
  },
  insertAfter: function ( newElement, refElement ){
    if ( refElement.nextSibling ) {
      this.element.insertBefore(newElement, refElement.nextSibling)
    }
    else {
      this.element.appendChild(newElement)
    }
    return this
  },
  insertAfterTo: function ( element ){
    if ( element.nextSibling ) {
      element.parentNode.insertBefore(this.element, element.nextSibling)
    }
    else {
      element.parentNode.appendChild(this.element)
    }
    return this
  },
  insertBefore: function ( newElement, refElement ){
    this.element.insertBefore(newElement, refElement)
    return this
  },
  insertBeforeTo: function ( element ){
    element.parentNode.insertBefore(this.element, element)
    return this
  },
  removeElement: function (){
    this.element.parentNode.removeChild(this.element)
    return this
  },
  removeChild: function ( childNode ){
    this.element.removeChild(childNode)
    return this
  },
  swapChildren: function ( child1, child2 ){
    var nextSibling = child1.nextSibling
    child2.parentNode.replaceChild(child1, child2)
    if ( nextSibling ) {
      nextSibling.parentNode.insertBefore(child2, nextSibling)
    }
    else {
      nextSibling.parentNode.appendChild(child2)
    }
  },
  swapElement: function ( anotherElement ){
    var nextSibling = this.element.nextSibling
    anotherElement.parentNode.replaceChild(this.element, anotherElement)
    if ( nextSibling ) {
      nextSibling.parentNode.insertBefore(anotherElement, nextSibling)
    }
    else {
      nextSibling.parentNode.appendChild(anotherElement)
    }
  },
  contains: function ( element ){
    return this.element.contains(element)
  },
  isSame: function ( element ){
    return this.element == element
  },
  setAttribute: function ( name, value ){
    this.element.setAttribute(name, value)
    return this
  },
  removeAttribute: function ( name ){
    this.element.removeAttribute(name)
    return this
  },
  hasAttribute: function ( name ){
    return this.element.hasAttribute(name)
  },
  getAttribute: function ( name ){
    return this.element.getAttribute(name)
  },
  textContent: function ( string ){
    if ( string === undefined ) {
      return this.element.textContent
    }
    else {
      return this.element.textContent = string
    }
  },
  value: function ( value ){
    if ( value === undefined ) {
      return this.element.value
    }
    else {
      return this.element.value = value
    }
  },
  innerHTML: function ( html ){
    if ( html === undefined ) {
      return this.element.innerHTML
    }
    else {
      return this.element.innerHTML = html
    }
  }
}

util.extend(Role.prototype, Radio.prototype)
},{"../utils":24,"./Radio":4,"./event":7}],6:[function(require,module,exports){
/* hive.RoleDefinition */

var util = require("../utils")
var HiveRole = require("./Role")
var DataModel = require("./DataModel")
var Binding = require("./Binding")
var globalRoles = require("./globalRoles")

module.exports = RoleDefinition

function createProxy( name, definer, appDefiner ){
  function Role( element, parentRole, appRole ){
    HiveRole.call(this, name, element, parentRole, appRole)
  }

  util.extend(Role.prototype, HiveRole.prototype)
  Role.prototype.renderSubRole = function ( subElement ){
    var subRole = definer.renderSubRoles(subElement, this, this.app)
    appDefiner.callDefinitions()
    return subRole
  }
  Role.prototype.renderSubRoles = function ( subElement ){
    var subRole = definer.renderSubRoles(subElement, this, this.app)
    appDefiner.callDefinitions()
    return subRole
  }
  return Role
}

function RoleDefinition( name, def, parent, app ){
  var definer = this

//  function Role( element, parentRole, appRole ){
//    HiveRole.call(this, name, element, parentRole, appRole)
//  }
//  util.extend(Role.prototype, HiveRole.prototype)
//  Role.prototype.renderSubRole = function ( subElement ){
//    var subRole = definer.renderSubRoles(subElement, this, this.app)
//    app.callDefinitions()
//    return subRole
//  }
//  Role.prototype.renderSubRoles = function ( subElement ){
//    var subRole = definer.renderSubRoles(subElement, this, this.app)
//    app.callDefinitions()
//    return subRole
//  }

  this.construct = createProxy(name, definer, app)
  this.name = name
  /**
   * Called right after instantiating the role
   * */
  this.initializer = function (){}
  /**
   * Called when every sub role is ready, every events and hooks are attached
   * */
  this.definition = def || function (){}
  this.parent = parent
  this.app = app

  this.roles = {}
  this.globalRoles = []
  this.eventHooks = []
  this.links = []
  this.models = {}
  this.options = {}

  this.setupOrder = []
}

RoleDefinition.prototype = {

  // private methods

  /**
   * Accumulating definitions on the app root.
   * This ensures event registration order.
   * Listeners attached by bindings should always fire first, then listeners from definitions.
   * */
  pushDefinition: function ( definer, role, parentRole, appRole ){
    if ( this.app ) {
      this.app.setupOrder.push([definer, role, parentRole, appRole])
    }
    else if ( this.parent ) {
      this.parent.pushDefinition(definer, role, parentRole, appRole)
    }
    else {
      this.setupOrder.push([definer, role, parentRole, appRole])
    }
  },
  /**
   * Hook events for each role.
   * Call definitions in setup order.
   * Then empty setup order.
   * */
  callDefinitions: function (){
    this.setupOrder.forEach(function ( setup ){
      var definer = setup[0]
        , def = definer.definition
        , role = setup[1]
        , parentRole = setup[2]
        , appRole = setup[3]
      definer.hookEvents(role)
      def.call(role, role, parentRole, appRole)
    })
    this.setupOrder = []
  },
  /**
   * Instantiate the role defined by this definer.
   * If this is an app definer, call the setup order.
   * */
  create: function ( element, parentRole, appRole ){
    var role = new this.construct(element, parentRole, appRole)
    appRole = appRole || role
    this.initializer.call(role)

    this.renderSubRoles(element, role, appRole)
    this.renderGlobalRoles(element, role, appRole)
    this.attachDataSets(role)
    this.linkReactors(role)

    this.pushDefinition(this, role, parentRole, appRole)

    if ( !this.parent ) {
      this.callDefinitions()
      this.renderAutoRoles(element, appRole)
    }

    return role
  },
  destroy: function (){
    var name
    for ( name in this.roles ) {
      this.roles[name].destroy()
      delete this.roles[name]
    }
    for ( name in this.models ) {
      this.models[name].destroy()
      delete this.models[name]
    }
    delete this.parent
    delete this.app
  },
  renderSubRole: function ( subElement, parentRole, appRole ){
    var definer = this
    var subName = util.subname(definer.name, subElement)
    var subDef = definer.findDefinition(subName)
    if ( !subDef ) {
      if ( this.app.options.allowAnonymousRoles ) {
        subDef = new RoleDefinition(subName, null, this, this.app)
        subDef.option("anonymous", true)
      }
      else {
        throw new Error("RoleDefinition error: '" + subName + "' couldn't be instantiated: Anonymous roles are disallowed")
      }
    }
    var subRole = subDef.create(subElement, parentRole, appRole)
    if ( subDef.options.multiple ) {
      (parentRole[subName] || (parentRole[subName] = [])).push(subRole)
    }
    else {
      parentRole[subName] = subRole
    }
    return subDef.definition
  },
  renderSubRoles: function ( parentElement, parentRole, appRole ){
    var roles = this.options.anonymous
      ? util.findAny(parentElement, false)
      : util.findSubsOf(this.name, parentElement)
    return roles.map(function ( subElement ){
      return this.renderSubRole(subElement, parentRole, appRole)
    }, this)
  },
  /**
   * Render app-specific role attached roles
   * like "paren:subRole generalGlobalRole"
   * */
  renderGlobalRoles: function ( element, hostRole, parentRole, appRole ){
    var definer = this
    this.globalRoles.forEach(function ( globalDefiner ){
      globalDefiner.initializer.call(hostRole)
      globalDefiner.renderSubRoles(element, hostRole, appRole)
      definer.app.setupOrder = definer.app.setupOrder.concat(globalDefiner.setupOrder)
      definer.app.setupOrder.push([globalDefiner, hostRole, parentRole, appRole])
    })
  },
  /**
   * Render non-app attached roles automatically at the end of setup
   * */
  renderAutoRoles: function( appElement, appRole ){
    util.findAny(appElement).forEach(function( el ){
      if( ~el.getAttribute("role").indexOf(":") ) return
      util.all(el).forEach(function( roleName ){
        if( !globalRoles.exists(roleName) ) return
        globalRoles.get(roleName).create(el, null, appRole)
      })
    })
  },
  attachDataSets: function ( role ){
    var dataSet
    for ( var name in this.models ) {
      dataSet = role.data[name] = this.models[name].createDataSet(role)
    }
  },
  /**
   * Hook a method to an event.
   * */
  hookEvents: function ( role ){
    this.eventHooks.forEach(function ( args ){
      var roleEvent = args[0].split(":")
        , eventName = roleEvent.pop()
        , eventRole = util.accessProperty(roleEvent, role)
        , method = args[1]

      if ( typeof method != "function" ) {
        var roleMethod = args[1].split(".")
          , methodName = roleMethod.pop()
          , methodRole = util.accessProperty(roleMethod, role)

        method = methodRole[methodName]

        if ( typeof method != "function" ) {
          throw new Error("Couldn't hook '" + methodName + "' with role: Not a function")
        }
      }

      eventRole.on(eventName, method.bind(role))
    })
  },
  /**
   * Set up bindings.
   * */
  linkReactors: function ( role ){
    this.links.forEach(function ( args ){
      new Binding(args[0], args[1], role).syncModel()
    }, this)
  },
  getDefinition: function ( roleName ){
    return this.roles[roleName]
  },
  findDefinition: function ( roleName ){
    return this.roles[roleName] || this.parent && this.parent.findDefinition(roleName)
  },
  findDataModel: function ( name ){
    return this.models[name] || this.parent && this.parent.findDataModel(name)
  },

  // public methods

  init: function ( f ){
    this.initializer = f
    return this
  },
  /**
   * Define a sub role on this branch and return its definer
   * */
  role: function ( name, extensions, def ){
    var roleDef = new RoleDefinition(name, def, this, this.app)
    if ( !def && typeof extensions == "function" ) def = extensions
    roleDef = new RoleDefinition(name, def, this, this.app)
    if ( Array.isArray(extensions) ) {
      extensions.forEach(function ( globalRole ){
        roleDef.augment(globalRole)
      })
    }
    return this.roles[name] = roleDef
  },
  /**
   * Augment the defined role with another.
   * Extends prototype and ques the global definer to apply on role instantiation.
   * */
  augment: function ( globalRole ){
    if ( globalRoles.exists(globalRole) ) {
      globalRole = globalRoles.get(globalRole)
      util.extend(this.construct.prototype, globalRole.construct.prototype)
      this.globalRoles.push(globalRole)
    }
    return this
  },
  /**
   * Extend the prototype of the inner constructor
   * */
  proto: function ( name, value ){
    if ( value != undefined ) {
      this.construct.prototype[name] = value
    }
    else if ( typeof name == "function" ) {
      util.extend(this.construct.prototype, name.prototype)
    }
    else if ( name instanceof RoleDefinition ) {
      util.extend(this.construct.prototype, name.construct.prototype)
    }
    else {
      util.extend(this.construct.prototype, name)
    }
    return this
  },
  /**
   * Define an event on this role and hook it to a method or provide a function that will be bound to the role.
   *
   * @param roleEvent{String} an accessor string in the following format: [<roleAccessor>:]<eventName>
   *                          example: "change", "checkbox:change", "panel.checkbox:change", "deep.panel.checkbox:change"
   * @param roleMethod{String|Function} a function, or a method accessor in dot notation format
   * */
  on: function ( roleEvent, roleMethod ){
    this.eventHooks.push([roleEvent, roleMethod])
    return this
  },
  /**
   * Define a data model, or inherit one from a parent definer, optionally extend it.
   * Inheriting will not modify the parent model.
   * Calling this on the same definer twice will return the previously defined model.
   *
   * @param name{String} a name for this model.
   *                     An instantiated data set will be available on the role by this name as data.<name>
   * @param simpleValues{Object} a hash of primitive values to provide defaults for the model.
   * */
  data: function ( name, simpleValues ){
    var model = this.models[name]
    if ( model ) return model
    model = this.findDataModel(name)
    if ( model ) return  this.models[name] = model.clone(this, simpleValues)
    return this.models[name] = new DataModel(name, simpleValues, this, this.app)
  },
  /**
   * Link an element's attribute to a data field on a model.
   * By default a `change` event is registered on the element
   * and the provided attributes value will update the model's field.
   * Changing the field on the model will also update the element's attribute value.
   * This is essentially two way data binding.
   *
   * Both operations trigger events according to their change.
   *
   * @param attrEvent{String} an accessor for a sub role element's attribute and an optional event
   *                          the format is: <attributeAccessor>[:<eventName>]
   *                          the default event is `change`
   * @param dataAccessor{String} an accessor for a data set field. the accessor is bound to the definer's role
   *                             the format is: <dataSetName>.<fieldName>
   * */
  link: function ( attrEvent, dataAccessor ){
    this.links.push([attrEvent, dataAccessor])
    return this
  },
  /**
   * Configure values on this definer.
   * @param prop{String|Object} a property name or a hash of property-value pairs.
   * @param [value]{String} a value if prop is a String
   * */
  option: function ( prop, value ){
    if ( value == undefined ) {
      util.extend(this.options, prop)
    }
    else {
      this.options[prop] = value
    }
    return this
  },
  /**
   * Plug in a bundled definition chain to the definer.
   * Useful for reusable or distributable definition parts.
   * @param plugin{Function} will receive the following arguments:
   *                         definer{RoleDefinition} - this instance
   *                         parentDefiner{RoleDefinition} - the parent of this definer (MAY BE NULL)
   *                         app{RoleDefinition} - the application definer bound to this chain
   * */
  use: function ( plugin ){
    plugin(this, this.parent, this.app)
    return this
  }
}

},{"../utils":24,"./Binding":2,"./DataModel":3,"./Role":5,"./globalRoles":8}],7:[function(require,module,exports){
/* hive.event */

var eventCache = {}

var event = {}

module.exports = event

/**
 * Register a custom event definition by name.
 * The definition is a function that, when called,
 * should handle custom logic, event registration, etc..
 * and return a function that tears down the controllers.
 *
 * Returns a function which calls the unregister returned by the definition,
 * but only if the arguments match with the original ones.
 *
 * @example
 *
 * var clickProxy = hud.event("clickproxy", function( element, listener, capture ){
   *   element.addEventListener("click", listener, capture)
   *   return function( element, listener, capture ){
   *     // these arguments are the same as in the closure
   *     // this function body is executed if the listener and the capture values match
   *     element.removeEventListener("click", listener, capture)
   *   }
   * })
 * var unregister = clickProxy(someElement, someFunction, true)
 * unregister(someFunction, true)
 *
 * @param {String} name - a name for this event
 * @param {Function} def - the definition of this event
 * */
event.define = function registerEvent( name, def ){
  // register a definition function
  return eventCache[name] = function addEventListener( element, listener, capture ){
    // normalize capture value for convenience
    capture = !!capture
    // when called, execute the custom logic and save the listener remover
    var doRemoveListener = def.apply(element, arguments)
    // and return a function that will call that remover
    return function removeEventListener( sameListener, sameCapture ){
      // but only if the same arguments are passed as before
      if ( sameListener === listener && sameCapture === capture ) {
        // execute custom tearing logic
        doRemoveListener(element, listener, capture)
      }
    }
  }
}

event.exists = function ( eventName ){
  return eventCache[eventName]
}

event.create = function ( eventName, context, args ){
  eventCache[eventName].apply(context, args)
}


},{}],8:[function(require,module,exports){
var globalRoles = {}
module.exports = {}
module.exports.register = function ( name, def ){
  // prevent circular references
  var RoleDefinition = require("./RoleDefinition")
  return globalRoles[name] = new RoleDefinition(name, def)
}
module.exports.exists = function ( name ){
  return name in globalRoles
}
module.exports.get = function ( name ){
  return globalRoles[name]
}
},{"./RoleDefinition":6}],9:[function(require,module,exports){
(function (global){
/* hive */

var App = require("./App")
var util = require("../utils")

var hive = {}
global.hive = hive
module.exports = hive

hive.request = require("./request")
hive.inject = require("./inject")
hive.event = require("./event")

var apps = {}

hive.app = function ( name, def ){
  return apps[name] || (apps[name] = new App(name, def))
}

util.extend(hive, require("./globalRoles"))
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../utils":24,"./App":1,"./event":7,"./globalRoles":8,"./inject":10,"./request":11}],10:[function(require,module,exports){
/* hive.inject */

module.exports = inject

var LOADING = 1
  , LOADED = 2
  , FAILED = 3

function normalizeSrc( src ){
  if ( src[0] == "/" ) {
    return location.protocol + "//" + location.host + src
  }
  else {
    return src
  }
}

function cache( src ){
  cache[normalizeSrc(src)] = LOADED
}
function fail( src ){
  cache[normalizeSrc(src)] = FAILED
}
function loading( src ){
  cache[normalizeSrc(src)] = LOADING
}
function isLoaded( src ){
  return cache[normalizeSrc(src)] == LOADED
}
function isLoading( src ){
  return cache[normalizeSrc(src)] == LOADING
}
function isFailed( src ){
  return cache[normalizeSrc(src)] == FAILED
}

function asyncLoader( load ){
  return function ( sources, done ){
    if ( typeof sources == "string" ) {
      sources = [sources]
    }
    var failed
      , toLoad = sources.length

    function next( error, src ){
      if ( error ) {
        fail(src)
        failed = failed || []
        failed.push({
          src: src,
          error: error
        })
      }
      else {
        cache(src)
      }
      if ( !--toLoad ) {
        done(failed)
      }
    }

    if ( !toLoad ) done()
    else sources.forEach(function ( src ){
      if ( isLoaded(src) ) {
        next(null, src)
      }
      else if ( isLoading(src) ) {
        // TODO: add a listener to a ready queue
      }
      else {
        loading(src)
        load(src, function ( e ){
          next(e, src)
        })
      }
    })
  }
}

function syncLoader( load ){
  return function ( sources, done ){
    if ( typeof sources == "string" ) {
      sources = [sources]
    }
    var failed
      , current = -1
      , toLoad = sources.length

    function next( error, src ){
      if ( error ) {
        fail(src)
        failed = failed || []
        failed.push({
          src: src,
          error: error
        })
      }
      else {
        cache(src)
      }
      if ( ++current == toLoad ) {
        done(failed)
      }
      else {
        if ( isLoaded(src) ) {
          next(null, src)
        }
        else if ( isLoading(src) ) {
          // TODO: add a listener to a ready queue
        }
        else {
          loading(src)
          load(sources[current], function ( e ){
            next(e, sources[current])
          })
        }
      }
    }

    if ( !toLoad ) done()
    else next()
  }
}

function injectScript( src, next ){
  var ok
    , error = null
    , script = document.createElement("script")
  script.onload = function (){
    ok || next(error)
    ok = true
  }
  script.onerror = function ( e ){
    ok || next(error = e)
    ok = true
  }
  document.head.appendChild(script)
  script.async = false
  script.src = src
}

function inject( srcs, done ){
  if ( !Array.isArray(srcs) ) srcs = [srcs]
  var scripts = srcs.filter(function ( src ){
    return /\.js$/.test(src)
  })
  var css = srcs.filter(function ( src ){
    return /\.css$/.test(src)
  })
  var toLoad = 0
  if ( scripts.length ) ++toLoad
  if ( css.length ) ++toLoad
  if ( !toLoad ) done()
  var next = function (){
    if ( !--toLoad ) done()
  }
  if ( scripts.length ) inject.script(scripts, next)
  if ( css.length ) inject.css(css, next)
}

inject.script = asyncLoader(injectScript)

inject.scriptSync = syncLoader(injectScript)

inject.css = asyncLoader(function ( src, next ){
  var ok
    , error = null
    , link = document.createElement("link")
  link.onload = function ( e ){
    ok || next(error)
    ok = true
  }
  link.onerror = function ( e ){
    ok || next(error = e)
    ok = true
  }
  document.head.appendChild(link)
  link.src = src
})

},{}],11:[function(require,module,exports){
/* hive.request */

var Radio = require("./Radio")

var methods = [
  'get', 'post', 'put', 'head', 'delete', 'options', 'trace', 'copy', 'lock', 'mkcol',
  'move', 'propfind', 'proppatch', 'unlock', 'report', 'mkactivity', 'checkout',
  'merge', 'm-search', 'notify', 'subscribe', 'unsubscribe', 'patch'
]

var mime = {}
mime["html"] = mime["text"] = "text/html"
mime["json"] = "application/json"
mime["xml"] = "application/xml"
mime["urlencoded"] = mime["form"] = mime["url"] = "application/x-www-form-urlencoded"
mime["form-data"] = mime["multipart"] = "multipart/form-data"

// upgrading your browser a bit
if ( !"".trim ) {
  String.prototype.trim = function (){
    return this.replace(/(^\s*|\s*$)/g, '')
  }
}
if ( ![].forEach ) {
  Array.prototype.forEach = function ( cb, context ){
    var i = -1
      , l = this.length
    while ( ++i < l ) {
      cb.call(context, this[i], i, this)
    }
  }
}

// utils

function createError( type, message ){
  var err = new Error(message)
  err.type = type
  return err
}

function createHTTP( cors ){
  var root = window || this
  var http = null
  if ( root.XMLHttpRequest && (root.location.protocol != "file:" || !root.ActiveXObject) ) {
    http = new XMLHttpRequest
    if ( cors && !("withCredentials" in http) ) {
      http = null
    }
  } else {
    if ( cors ) {
      if ( typeof root.XDomainRequest != "undefined" ) {
        http = new root.XDomainRequest()
      }
    }
    else {
      try { return new ActiveXObject("Microsoft.XMLHTTP") }
      catch ( e ) {}
      try { return new ActiveXObject("Msxml2.XMLHTTP.6.0") }
      catch ( e ) {}
      try { return new ActiveXObject("Msxml2.XMLHTTP.3.0") }
      catch ( e ) {}
      try { return new ActiveXObject("Msxml2.XMLHTTP") }
      catch ( e ) {}
    }
  }
  return http
}

function noop(){}

function extend( obj, ext ){
  for ( var key in ext ) {
    if ( ext.hasOwnProperty(key) ) obj[key] = ext[key]
  }
  return obj
}

function parseData( data ){
  var ret = {}
  data.split("&").forEach(function ( pair ){
    var parts = pair.split("=")
    ret[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1])
  })
  return ret
}

function serializeData( data ){
  var pairs = []
  for ( var key in data ) {
    pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
  }
  return pairs.join("&")
}

/**
 * A class to orchestrate a request
 *
 * @param method{String}
 * @param url{String}
 * */
function RequestOptions( method, url ){
  this.headers = {}
  this.query = {}
  this.data = null
  this.form = null
  this.method = method
  this.url = url
}

RequestOptions.prototype = {}
RequestOptions.prototype.guessHeader = function (){
  var contentType = this.getHeader("Content-Type")
  if ( contentType ) return
  var data = this.form || this.data
  var dataType = {}.toString.call(data)
  switch ( true ) {
    case this.method == "GET":
    case this.method == "HEAD":
      break
    case typeof data == "string":
    case typeof data == "number":
    case typeof data == "boolean":
      this.setHeader("Content-Type", "text/html")
      break
    case dataType == "[object File]":
    case dataType == "[object Blob]":
    case dataType == "[object FormData]":
      break
    case dataType == "[object Object]":
    case Array.isArray(data):
    default:
      this.setHeader("Content-Type", "application/json")
  }
}
RequestOptions.prototype.createBody = function (){
  var data = this.form || this.data
  var dataType = {}.toString.call(data)
  var contentType = this.getHeader("Content-Type")
  switch ( true ) {
    case this.method == "GET":
    case this.method == "HEAD":
    case typeof data == "string":
    case dataType == "[object File]":
    case dataType == "[object Blob]":
    case dataType == "[object FormData]":
    case !contentType:
      return data
    case contentType == "application/x-www-form-urlencoded":
      return serializeData(data)
    case contentType == "application/json":
      return JSON.stringify(data)
    default:
      return data
  }
}
RequestOptions.prototype.prepare = function (){
  var http = createHTTP(this.cors)
  var query = serializeData(this.query)
  var method = this.method
  var url = this.url
  var headers = this.headers

  // query string
  if ( query ) {
    url += ~url.indexOf("?")
      ? "&" + query
      : "?" + query
  }

  // CORS
  if ( this.withCredentials ) http.withCredentials = true

  // open connection
  if ( this.user && this.password ) {
    http.open(method, url, true, this.user, this.password)
  }
  else {
    http.open(method, this.url, true)
  }

  // set request headers
  for ( var field in headers ) {
    if ( headers[field] ) {
      http.setRequestHeader(field, headers[field])
    }
  }

  return http
}
RequestOptions.prototype.attach = function ( field, file, filename ){
  if ( window.FormData ) {
    this.form = this.form || new FormData()
    if ( this.form.append ) {
      this.form.append(field, file, filename)
    }
    else {
      throw new Error("Couldn't append to " + this.form)
    }
  }
  else {
    this.addData(field, file)
  }
}
RequestOptions.prototype.setData = function ( name, value ){
  if ( value != undefined ) {
    this.data = this.data || {}
    this.data[name] = value
  }
  else {
    this.data = name
  }
  this.guessHeader()
}
RequestOptions.prototype.setForm = function ( form ){
  if ( form instanceof Element && form.tagName == "FORM" ) {
    if ( window.FormData ) {
      this.form = new FormData(form)
    }
    else {
      [].slice.call(form).forEach(function ( field ){
        if ( field.name ) this.addData(field.name, field.value)
      }, this)
    }
  }
  else {
    this.form = form
  }
  this.guessHeader()
}
RequestOptions.prototype.addData = function ( name, value ){
  this.data = this.data || {}
  if ( value != undefined ) {
    this.data[name] = value
  }
  else if ( typeof name != "string" ) extend(this.data, name)
  this.guessHeader()
}
/**
 * Get the lowercase key value of a header.
 * */
RequestOptions.prototype.getHeader = function ( name ){
  return this.headers[name.toLowerCase()]
}
/**
 * Set a single header or a hash of header key-value pairs.
 * The key is lowercased.
 * */
RequestOptions.prototype.setHeader = function ( key, value ){
  if ( value != undefined ) {
    this.headers[key.toLowerCase()] = value
  }
  else if ( typeof key != "string" ) {
    for ( var field in key ) {
      this.headers[field.toLowerCase()] = key[field]
    }
  }
}

RequestOptions.prototype.addQuery = function ( key, value ){
  if ( value != undefined ) {
    this.query[key] = value
  }
  else if ( typeof key != "string" ) extend(this.headers, key)
}
RequestOptions.prototype.setUser = function ( user, password ){
  this.user = user
  this.password = password
}

/**
 * An objecet representing a request
 *
 * @param method{String}
 * @param url{String}
 * */
function Request( method, url ){
  this.channels = {}
  this.options = new RequestOptions(method, url)
}

Request.prototype = {}
extend(Request.prototype, Radio.prototype)

/**
 * Set `Authorization` header field.
 *
 * @param user {String}
 * @param pass {String}
 * @return {Request}
 * */
Request.prototype.auth = function ( user, pass ){
  this.header("Authorization", "Basic" + btoa(user + ":" + pass))
  return this
}

/**
 * Set `user` and `password` arguments for http request `open` method.
 *
 * @param user {String}
 * @param pass {String}
 * @return {Request}
 * */
Request.prototype.user = function ( user, pass ){
  this.options.setUser(user, pass)
  return this
}

/**
 * Set header field(s)
 *
 * @param field {Object|String}
 * @param [value] {String}
 * @return {Request}
 * */
Request.prototype.header = function ( field, value ){
  this.options.setHeader(field, value)
  return this
}

/**
 * @param name {Object|String} a hash of query key/value pairs or a query key
 * @param [value] {String} query must be String if given
 * */
Request.prototype.query = function ( name, value ){
  this.options.addQuery(name, value)
  return this
}

/**
 * Set `Content-Type` header
 *
 * @param contentType {String}
 * @return {Request}
 * */
Request.prototype.contentType = function ( contentType ){
  contentType = mime[contentType] || contentType
  this.header("Content-Type", contentType)
  return this
}

/**
 * Set `Accept` header
 *
 * @param accept {String}
 * @return {Request}
 * */
Request.prototype.accept = function ( accept ){
  accept = mime[accept] || accept
  this.header("Accept", accept)
  return this
}

/**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 */
Request.prototype.withCredentials = function (){
  this.options.withCredentials = true
  return this
}

/**
 * Set the data to be sent to a form as FormData (if available)
 *
 * @param form {Element|FormData} the form to be sent
 * @return {Request}
 * */
Request.prototype.form = function ( form ){
  this.options.setForm(form)
  return this
}

/**
 * Appends data to the internal form data.
 * Using the `FormData` API.
 *
 * @param field{String}
 * @param file{Blob|File}
 * @param [filename]{String}
 * @return {Request}
 */
Request.prototype.attach = function ( field, file, filename ){
  this.options.attach(field, file, filename)
  return this
}

/**
 * Adding fields to the internal data hash.
 * Calling this without explicitly setting the Content-Type header
 * will automatically set it to `application/json`.
 * @param name{Object|String}
 * @param [value]{String}
 * @return {Request}
 * */
Request.prototype.send = function ( name, value ){
  this.options.setData(name, value)
  return this
}

/**
 * Append fields to the data to be sent.
 * @param name{Object|String}
 * @param [value]{String}
 * @return {Request}
 * */
Request.prototype.append = function ( name, value ){
  this.options.addData(name, value)
  return this
}

/**
 * Abort the request.
 * Also fires the `abort` event.
 * @return {Request}
 * */
Request.prototype.abort = function (){
  if ( this.aborted ) return this
  this.aborted = true
  this.http.abort()
  this.broadcast("abort")
  return this
}

/**
 * Set a timeout for the request.
 * If the timer expires before the request finishes
 * it aborts the request and posses a `timeout` error to the callback.
 *
 * @param ms{Number}
 * @return {Request}
 * */
Request.prototype.timeout = function ( ms ){
  this.timeoutTime = ms
  return this
}

/**
 * Enable Cross Origin requests.
 * If an explicit attempt is made for a cross origin request,
 * but such a thing is not supported by your browser,
 * the request fails before opening a connection.
 * In this case an error with a type of `cors` will be passed to the end callback.
 *
 * @return {Request}
 * */
Request.prototype.cors = function (){
  this.options.cors = true
  return this
}

/**
 * Kicks off the communication.
 *
 * @param [callback]{Function}
 * @return {Request}
 * */
Request.prototype.end = function ( callback ){
  callback = callback || noop
  var req = this
  var options = this.options
  var http = options.prepare()
  var timeoutId
  var timeout = this.timeoutTime
  this.http = http

  if ( this.options.cors && !http ) {
    callback(createError("cors", "Cross Origin requests are not supported"))
    return this
  }

  http.onreadystatechange = function (){
    if ( http.readyState != 4 ) return
    if ( http.status == 0 ) {
      if ( req.aborted ) {
        callback(createError("timeout", "Connection timed out"))
      }
      else {
        callback(createError("crossDomain", "Origin is not allowed by Access-Control-Allow-Origin"))
      }
    }
    else req.broadcast("end")
  }
  if ( http.upload ) {
    http.upload.onprogress = function ( e ){
      e.percent = e.loaded / e.total * 100
      req.broadcast("progress", e)
    }
  }

  req.listenOnce("abort", function (){
    clearTimeout(timeoutId)
  })
  req.listenOnce("end", function (){
    clearTimeout(timeoutId)
    callback(null, new Response(this))
  })

  if ( timeout ) {
    timeoutId = setTimeout(function (){
      req.abort()
    }, options.timeout)
  }

  this.broadcast("send")
  http.send(options.createBody())
  return this
}

// Response initializers

function setStatus( res, req ){
  var http = req.http
  var status = http.status
  var type = status / 100 | 0

  res.status = http.status
  res.statusType = type

  res.info = type == 1
  res.ok = type == 2
  res.clientError = type == 4
  res.serverError = type == 5
  res.error = (type == 4 || type == 5)
    ? new Error("Cannot " + req.options.method + " " + req.options.url + " " + status)
    : false

  res.created = status == 201
  res.accepted = status == 202
  res.noContent = status == 204 || status == 1223
  res.badRequest = status == 400
  res.unauthorized = status == 401
  res.notAcceptable = status == 406
  res.notFound = status == 404
  res.forbidden = status == 403
  res.internalServerError = status == 500
}

function parseHeaders( req ){
  var headers = req.http.getAllResponseHeaders()
    , lines = headers.split(/\r?\n/)
    , fields = {}

  lines.pop() // trailing CRLF
  lines.forEach(function ( line ){
    var i = line.indexOf(":")
      , field = line.slice(0, i).toLowerCase()
    fields[field] = line.slice(i + 1).trim()
  })

  fields["content-type"] = req.http.getResponseHeader("content-type")
  return fields
}

function parseBody( contentType, responseText ){
  switch ( contentType ) {
    case "application/x-www-form-urlencoded":
      return parseData(responseText)
    case "application/json":
      return JSON.parse(responseText)
    default:
      return responseText
  }
}

function parseValue( val ){
  var low = val.toLowerCase()
    , int = parseInt(val)
    , float = parseFloat(val)
  switch ( true ) {
    case low == "true":
      return true
    case low == "false":
      return false
    case low == "null":
      return null
    case !isNaN(float):
      return float
    case !isNaN(int):
      return int
    default :
      return val
  }
}

function Response( req ){
  var resp = this
  var http = req.http
  this.text = http.responseText
  setStatus(this, req)
  this.headers = parseHeaders(req)
  var contentType = this.header("Content-Type")
  if ( contentType ) contentType.split(/\s*;\s*/).forEach(function ( str ){
    var p = str.split(/\s*=\s*/)
    if ( p[1] ) {
      resp[p[0]] = p[1]
    }
    else {
      resp.contentType = p[0]
    }
  })
  this.body = req.method != "HEAD" && http.responseText && this.contentType
    ? parseBody(this.contentType, http.responseText)
    : null
}

Response.prototype = {
  body: null,
  header: function ( field ){
    return this.headers[field.toLowerCase()]
  },
  headerParams: function ( field ){
    var header = this.header(field)
    if ( !header ) return null
    var params = {}
    header.split(/\s*[;,]\s*/).forEach(function ( str ){
      var p = str.split(/\s*=\s*/)
        , key = p[0]
        , val = p[1]
      if ( val ) {
        params[key] = parseValue(val)
      }
      else {
        params[key] = true
      }
    })
    return params
  }
}

/**
 * main request function
 *
 * @param method{String}
 * @param url{String}
 * */
function request( method, url ){
  switch ( true ) {
    case !url:
      return new Request("GET", method)
    case typeof url == "function":
      return new Request("GET", method).end(url)
    default :
      return new Request(method, url)
  }
}

// define common request methods as static functions
methods.forEach(function ( method ){
  request[method.toLowerCase()] = function ( url, fn ){
    var req = request(method.toUpperCase(), url)
    fn && req.end(fn)
    return req
  }
})

module.exports = request

},{"./Radio":4}],12:[function(require,module,exports){
/* hive.dom.boxModel */

var Role = require("../core/Role")
var style = require("./style")

module.exports = boxModel

function boxModel( element ){
  var box = {}
  box.width = element.offsetWidth
  box.height = element.offsetHeight
  box.paddingLeft = parseInt(style(element, "padding-left"))
  box.paddingRight = parseInt(style(element, "padding-right"))
  box.paddingTop = parseInt(style(element, "padding-top"))
  box.paddingBottom = parseInt(style(element, "padding-bottom"))
  box.paddingWidth = box.width
    + box.paddingLeft
    + box.paddingRight
  box.paddingHeight = box.height
    + box.paddingTop
    + box.paddingBottom
  box.borderLeft = parseInt(style(element, "border-left"))
  box.borderRight = parseInt(style(element, "border-right"))
  box.borderTop = parseInt(style(element, "border-top"))
  box.borderBottom = parseInt(style(element, "border-bottom"))
  box.borderWidth = box.paddingWidth
    + box.borderLeft
    + box.borderRight
  box.borderHeight = box.paddingHeight
    + box.borderTop
    + box.borderBottom
  box.marginLeft = parseInt(style(element, "border-left"))
  box.marginRight = parseInt(style(element, "margin-right"))
  box.marginTop = parseInt(style(element, "margin-top"))
  box.marginBottom = parseInt(style(element, "margin-bottom"))
  box.marginWidth = box.paddingWidth
    + box.marginLeft
    + box.marginRight
  box.marginHeight = box.paddingHeight
    + box.marginTop
    + box.marginBottom
  return box
}

Role.extend({
  boxModel: function (){
    return boxModel(this.element)
  }
})
},{"../core/Role":5,"./style":16}],13:[function(require,module,exports){
var dom = {}
module.exports = dom
dom.boxModel = require("./boxModel")
dom.position = require("./position")
dom.scrollable = require("./scrollable")
dom.style = require("./style")
dom.viewport = require("./viewport")
},{"./boxModel":12,"./position":14,"./scrollable":15,"./style":16,"./viewport":17}],14:[function(require,module,exports){
/* hive.dom.position */

var Role = require("../core/Role")
var getScrollable = require("./scrollable")
var viewport = require("./viewport")

var position = {}
module.exports = position
position.offset = offsetPosition
position.viewport = viewportPosition

function offsetPosition( el ){
  var parent = el
    , left = 0
    , top = 0
  while ( parent && parent.offsetLeft != undefined && parent.offsetTop != undefined ) {
    left += parent.offsetLeft
    top += parent.offsetTop
    parent = parent.parentNode
  }
  return {
    top: top,
    left: left,
    right: left + el.offsetWidth,
    bottom: top + el.offsetHeight,
    height: el.offsetHeight,
    width: el.offsetWidth
  }
}

function viewportPosition( el ){
  var scrollable = getScrollable()
    , position = offsetPosition(el)
    , viewPort = viewport()
    , viewPortCenterY = (viewPort.height / 2) >> 0
    , viewPortCenterX = (viewPort.width / 2) >> 0
    , elementCenterY = (position.height / 2) >> 0
    , elementCenterX = (position.width / 2) >> 0

    , topFromTop = position.top - scrollable.scrollTop
    , topFromCenter = topFromTop - viewPortCenterY
    , topFromBottom = topFromTop - viewPort.height

    , bottomFromTop = topFromTop + position.height
    , bottomFromCenter = topFromCenter + position.height
    , bottomFromBottom = topFromBottom + position.height

    , leftFromLeft = position.left - scrollable.scrollLeft
    , leftFromCenter = leftFromLeft - viewPortCenterX
    , leftFromRight = leftFromLeft - viewPort.width

    , rightFromLeft = leftFromLeft + position.width
    , rightFromCenter = leftFromCenter + position.width
    , rightFromRight = leftFromRight + position.width

    , centerFromCenterY = topFromCenter + elementCenterY
    , centerFromCenterX = leftFromCenter + elementCenterX

  return {
    topFromTop: topFromTop,
    topFromCenter: topFromCenter,
    topFromBottom: topFromBottom,
    leftFromLeft: leftFromLeft,
    leftFromCenter: leftFromCenter,
    leftFromRight: leftFromRight,
    rightFromLeft: rightFromLeft,
    rightFromCenter: rightFromCenter,
    rightFromRight: rightFromRight,
    bottomFromTop: bottomFromTop,
    bottomFromCenter: bottomFromCenter,
    bottomFromBottom: bottomFromBottom,
    centerFromCenterY: centerFromCenterY,
    centerFromCenterX: centerFromCenterX
  }
}

Role.extend({
  offsetPosition: function (){
    return offsetPosition(this.element)
  },
  viewportPosition: function (){
    return viewportPosition(this.element)
  }
})


},{"../core/Role":5,"./scrollable":15,"./viewport":17}],15:[function(require,module,exports){
/* hive.scrollable */
var cached
module.exports = scrollable
function scrollable( eventTarget ){
  if ( cached ) return cached
  eventTarget = eventTarget || document.body
  // get the actually scrollable element
  if ( !eventTarget.nodeName || !!~[
    "iframe", "#document", "html", "body"
  ].indexOf(eventTarget.nodeName.toLowerCase()) ) {
    var doc = (eventTarget.contentWindow || eventTarget).document || eventTarget.ownerDocument || eventTarget
    eventTarget = /webkit/i.test(navigator.userAgent) || doc.compatMode == "BackCompat"
      ? doc.body
      : doc.documentElement
  }
  return cached = eventTarget
}
},{}],16:[function(require,module,exports){
/* hive.dom.style */
var Role = require("../core/Role")

module.exports = getStyle

function getStyle( el, prop ){
  var value = ""
  if ( window.getComputedStyle ) {
    value = getComputedStyle(el).getPropertyValue(prop)
  }
  else if ( el.currentStyle ) {
    try {
      value = el.currentStyle[prop]
    }
    catch ( e ) {}
  }
  return value;
}

Role.extend({
  style: function ( prop, value ){
    if ( value === undefined ) {
      if ( typeof prop === "string" ) {
        return getStyle(this.element, prop)
      }
      else for ( var name in prop ) {
        this.element.style[name] = prop[name]
      }
    }
    else {
      this.element.style[prop] = value
    }
    return this
  }
})
},{"../core/Role":5}],17:[function(require,module,exports){
module.exports = viewport

/**
 * Get the viewport width and height
 * @return { width, height }
 * */
function viewport(){
  var width = 0
    , height = 0
  if ( typeof( window.innerWidth ) == 'number' ) {
    //Non-IE
    width = window.innerWidth;
    height = window.innerHeight;
  } else if ( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) ) {
    //IE 6+ in 'standards compliant mode'
    width = document.documentElement.clientWidth
    height = document.documentElement.clientHeight
  } else if ( document.body && ( document.body.clientWidth || document.body.clientHeight ) ) {
    //IE 4 compatible
    width = document.body.clientWidth
    height = document.body.clientHeight
  }
  return {
    width: width,
    height: height
  }
}
},{}],18:[function(require,module,exports){
var event = require("../core/event")
var getPositions = require("../dom/position").viewport
event.define("contact", function ( element, listener, capture ){
  function contactListener(){
    listener(getPositions(element))
  }

  window.addEventListener("scroll", contactListener, capture)
  return function ( element, listener, capture ){
    window.removeEventListener("scroll", contactListener, capture)
  }
})
},{"../core/event":7,"../dom/position":14}],19:[function(require,module,exports){
var event = require("../core/event")

var specials = {
  esc: 27,
  enter: 13,
  tab: 9,
  backspace: 8,
  space: 32,
  shift: 16,
  control: 17,
  alt: 18,
  capsLock: 20,
  numLock: 144,

  up: 38,
  down: 40,
  left: 37,
  right: 39,

  insert: 45,
  "delete": 46,
  home: 36,
  end: 35,
  pageUp: 33,
  pageDown: 34,

  f1: 112,
  f2: 113,
  f3: 114,
  f4: 115,
  f5: 116,
  f6: 117,
  f7: 118,
  f8: 119,
  f9: 120,
  f10: 121,
  f11: 122,
  f12: 123
}

function createKeyEvent( e ){
  e.is = function is( code ){
    switch ( typeof code ) {
      case "number":
        return e.keyCode == code
      case "string":
        return code in e
          ? !!e[code]
          : code in specials && specials[code] == e.keyCode
      default:
        if ( arguments.length > 1 ) {
          code = [].slice.call(arguments)
        }
        return code.every(is)
    }
  }
  return e
}

event.define("key", function ( element, listener, capture ){
  function keyup( e ){
    return listener(e, createKeyEvent(e))
  }

  element.addEventListener("keyup", keyup, false)
  return function ( element, listener, capture ){
    element.removeEventListener("keyup", keyup, false)
  }
})

},{"../core/event":7}],20:[function(require,module,exports){
var event = require("../core/event")
event.define("missclick", function ( element, listener, capture ){
  function missClick( e ){
    if ( element.contains(e.target) || e.target == element ) {
      return
    }
    listener(e)
  }

  window.addEventListener("click", missClick, true)
  return function ( element, listener, capture ){
    window.removeEventListener("click", missClick, true)
  }
})
},{"../core/event":7}],21:[function(require,module,exports){
var event = require("../core/event")
event.define("type", function ( el, callback, capture ){
  var pressed = 0
    , released = 1

  function press( e ){
    pressed && callback.call(this, e)
    released = 0
  }

  function up( e ){
    if ( !released ) {
      callback.call(this, e)
      released = 1
    }
    pressed = 0
  }

  el.addEventListener("keypress", press, capture)
  el.addEventListener("keyup", up, capture)
  return function removeListeners(){
    el.removeEventListener("keypress", press, capture)
    el.removeEventListener("keyup", up, capture)
  }
})

},{"../core/event":7}],22:[function(require,module,exports){
(function (global){
var hive = module.exports = global.hive = require("./core")
hive.dom = require("./dom")
require("./events/contact")
require("./events/key")
require("./events/missclick")
require("./events/type")
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./core":9,"./dom":13,"./events/contact":18,"./events/key":19,"./events/missclick":20,"./events/type":21}],23:[function(require,module,exports){
/* hive.filter */

var filters = {}
module.exports = filters

// constants used by the filter function
var FILTER_PICK = filters.FILTER_PICK = 1
/**
 * Skip node but continue with children
 * */
var FILTER_SKIP = filters.FILTER_SKIP = 2
/**
 * Ignore node
 * */
var FILTER_IGNORE = filters.FILTER_IGNORE = 3
/**
 * Pick the node and ignore children
 * */
var FILTER_IGNORE_PICK = filters.FILTER_IGNORE_PICK = 4
/**
 * Stop filtering and return
 * */
var FILTER_STOP = filters.FILTER_STOP = 5

/**
 * Iterates over every child node, and according to the filter function's
 * return value, it picks, skips, or ignores a node.
 * Picked nodes will be part of the return array.
 * skipped nodes not, but their child nodes will still be checked.
 * Ignored nodes won't have their child nodes iterated recursively.
 * The root element will not be checked with the filter, only its child nodes.
 * */
filters.filter = function ( element, filter, childTypes ){
  var children = element[childTypes] || element
    , descendants
    , i = -1
    , l = children.length
    , ret = []
    , stack = []
  if ( !l ) return ret
  while ( ++i < l ) {
    switch ( filter(children[i]) ) {
      case FILTER_IGNORE_PICK:
        ret.push(children[i])
        break
      case FILTER_PICK:
        ret.push(children[i])
        descendants = children[i][childTypes]
        if ( i < l && descendants && descendants.length ) {
          stack.push([children, i, l])
          children = children[i][childTypes]
          i = -1
          l = children.length
        }
        break
      case FILTER_SKIP:
        descendants = children[i][childTypes]
        if ( i < l && descendants && descendants.length ) {
          stack.push([children, i, l])
          children = children[i][childTypes]
          i = -1
          l = children.length
        }
        break
      case FILTER_IGNORE:
        break
      case FILTER_STOP:
        return ret
    }
    while ( stack.length && i + 1 >= l ) {
      children = stack.pop()
      i = children[1]
      l = children[2]
      children = children[0]
    }
  }
  return ret
}

filters.filterElements = function ( root, filter ){
  return filters.filter(root, filter, "children")
}

filters.filterChildNodes = function ( root, filter ){
  return filters.filter(root, filter, "childNode")
}



},{}],24:[function(require,module,exports){
/* hive.util */

var util = {}
module.exports = util

util.extend = function extend( obj, extension ){
  for ( var prop in extension ) {
    if( extension.hasOwnProperty(prop) ) obj[prop] = extension[prop]
  }
  return obj
}

util.accessProperty = function ( parts, hostObj ){
  return parts.reduce(function ( obj, part ){
    return obj && obj.hasOwnProperty(part) ? obj[part] : null
  }, hostObj)
}

util.extend(util, require("./filter"))
util.extend(util, require("./role"))
util.extend(util, require("./selector"))


},{"./filter":23,"./role":25,"./selector":26}],25:[function(require,module,exports){
/* hive.role */

var role = {}
module.exports = role
role.contains = contains
role.all = all
role.subname = subname

function contains( element, role ){
  var roles = all(element)
  if ( !roles ) return false
  var i = -1
    , l = roles.length
  if ( typeof role == "string" ) {
    while ( ++i < l ) {
      if ( roles[i] == role ) return true
    }
  }
  else {
    while ( ++i < l ) {
      if ( role.test(roles[i]) ) return true
    }
  }
  return false
}

function all( element ){
  var roles = element.getAttribute("role")
  if ( !roles ) return null
  return roles.trim().split(/\s+/)
}

function subname( roleName, element ){
  roleName = new RegExp("^.*?" + roleName + ":(\\w+).*?$")
  return element.getAttribute("role").replace(roleName, "$1")
}

},{}],26:[function(require,module,exports){
/* hive selector */

var filters = require("./filter")
var roleHelper = require("./role")

var selectors = {}
module.exports = selectors

selectors.find = function ( name, root ){
  var element = null
  root = root || document.body
  if ( !root ) {
    throw new Error("Couldn't search for " + name + " in root (" + root + ")")
  }
  if ( name ) filters.filterElements(root, function ( el ){
    if ( roleHelper.contains(el, name) ) {
      element = el
      return filters.FILTER_STOP
    }
    return filters.FILTER_SKIP
  })
  return element
}

selectors.findAll = function ( name, root, deep ){
  if ( !name ) {
    return []
  }
  root = root || document.body
  if ( !root ) {
    throw new Error("Couldn't search for " + name + " in root (" + root + ")")
  }
  var pickStrategy = deep == true || deep == undefined
    ? filters.FILTER_PICK
    : filters.FILTER_IGNORE_PICK
  return filters.filterElements(root, function ( el ){
    return roleHelper.contains(el, name)
      ? pickStrategy
      : filters.FILTER_SKIP
  })
}

selectors.findAny = function ( root, deep ){
  if ( !root ) {
    throw new Error("Couldn't search in root (" + root + ")")
  }
  var pickStrategy = deep == true || deep == undefined
    ? filters.FILTER_PICK
    : filters.FILTER_IGNORE_PICK
  return filters.filterElements(root, function ( el ){
    return roleHelper.contains(el, /.*/)
      ? pickStrategy
      : filters.FILTER_SKIP
  })
}

selectors.findSubsOf = function ( name, root ){
  if ( !name ) {
    return []
  }
  root = root || document.body
  if ( !root ) {
    throw new Error("Couldn't search for " + name + " in root (" + root + ")")
  }
  var match = new RegExp("(?:^|\\s)" + name + ":(\\w+?)(?::|\\s|$)")
  return filters.filterElements(root, function ( el ){
    return roleHelper.contains(el, match)
      ? filters.FILTER_PICK
      : filters.FILTER_SKIP
  })
}

},{"./filter":23,"./role":25}]},{},[22])