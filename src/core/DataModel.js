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
