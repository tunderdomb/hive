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

