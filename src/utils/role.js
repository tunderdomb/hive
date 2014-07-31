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
