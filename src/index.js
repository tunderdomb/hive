var hive = module.exports = global.hive = require("./core")
hive.dom = require("./dom")
require("./events/contact")
require("./events/key")
require("./events/missclick")
require("./events/type")