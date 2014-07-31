/* hive selector */

var filters = require("./filter")
var roleHelper = require("./role")

var selectors = {}
module.exports = selectors

selectors.find = function ( name, root ){
  var element = null
  root = root || document.body
  if ( !root ) {
    throw new Error("Couldn't search for " + name + " in root (" + root + ")")
  }
  if ( name ) filters.filterElements(root, function ( el ){
    if ( roleHelper.contains(el, name) ) {
      element = el
      return filters.FILTER_STOP
    }
    return filters.FILTER_SKIP
  })
  return element
}

selectors.findAll = function ( name, root, deep ){
  if ( !name ) {
    return []
  }
  root = root || document.body
  if ( !root ) {
    throw new Error("Couldn't search for " + name + " in root (" + root + ")")
  }
  var pickStrategy = deep == true || deep == undefined
    ? filters.FILTER_PICK
    : filters.FILTER_IGNORE_PICK
  return filters.filterElements(root, function ( el ){
    return roleHelper.contains(el, name)
      ? pickStrategy
      : filters.FILTER_SKIP
  })
}

selectors.findAny = function ( root, deep ){
  if ( !root ) {
    throw new Error("Couldn't search in root (" + root + ")")
  }
  var pickStrategy = deep == true || deep == undefined
    ? filters.FILTER_PICK
    : filters.FILTER_IGNORE_PICK
  return filters.filterElements(root, function ( el ){
    return roleHelper.contains(el, /.*/)
      ? pickStrategy
      : filters.FILTER_SKIP
  })
}

selectors.findSubsOf = function ( name, root ){
  if ( !name ) {
    return []
  }
  root = root || document.body
  if ( !root ) {
    throw new Error("Couldn't search for " + name + " in root (" + root + ")")
  }
  var match = new RegExp("(?:^|\\s)" + name + ":(\\w+?)(?::|\\s|$)")
  return filters.filterElements(root, function ( el ){
    return roleHelper.contains(el, match)
      ? filters.FILTER_PICK
      : filters.FILTER_SKIP
  })
}
