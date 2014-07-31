/* hive.filter */

var filters = {}
module.exports = filters

// constants used by the filter function
var FILTER_PICK = filters.FILTER_PICK = 1
/**
 * Skip node but continue with children
 * */
var FILTER_SKIP = filters.FILTER_SKIP = 2
/**
 * Ignore node
 * */
var FILTER_IGNORE = filters.FILTER_IGNORE = 3
/**
 * Pick the node and ignore children
 * */
var FILTER_IGNORE_PICK = filters.FILTER_IGNORE_PICK = 4
/**
 * Stop filtering and return
 * */
var FILTER_STOP = filters.FILTER_STOP = 5

/**
 * Iterates over every child node, and according to the filter function's
 * return value, it picks, skips, or ignores a node.
 * Picked nodes will be part of the return array.
 * skipped nodes not, but their child nodes will still be checked.
 * Ignored nodes won't have their child nodes iterated recursively.
 * The root element will not be checked with the filter, only its child nodes.
 * */
filters.filter = function ( element, filter, childTypes ){
  var children = element[childTypes] || element
    , descendants
    , i = -1
    , l = children.length
    , ret = []
    , stack = []
  if ( !l ) return ret
  while ( ++i < l ) {
    switch ( filter(children[i]) ) {
      case FILTER_IGNORE_PICK:
        ret.push(children[i])
        break
      case FILTER_PICK:
        ret.push(children[i])
        descendants = children[i][childTypes]
        if ( i < l && descendants && descendants.length ) {
          stack.push([children, i, l])
          children = children[i][childTypes]
          i = -1
          l = children.length
        }
        break
      case FILTER_SKIP:
        descendants = children[i][childTypes]
        if ( i < l && descendants && descendants.length ) {
          stack.push([children, i, l])
          children = children[i][childTypes]
          i = -1
          l = children.length
        }
        break
      case FILTER_IGNORE:
        break
      case FILTER_STOP:
        return ret
    }
    while ( stack.length && i + 1 >= l ) {
      children = stack.pop()
      i = children[1]
      l = children[2]
      children = children[0]
    }
  }
  return ret
}

filters.filterElements = function ( root, filter ){
  return filters.filter(root, filter, "children")
}

filters.filterChildNodes = function ( root, filter ){
  return filters.filter(root, filter, "childNode")
}


