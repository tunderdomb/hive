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
