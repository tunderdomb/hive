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