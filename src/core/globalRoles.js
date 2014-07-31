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