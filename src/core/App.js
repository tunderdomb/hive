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