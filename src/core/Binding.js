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

