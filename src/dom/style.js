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