/* hive.dom.position */

var Role = require("../core/Role")
var getScrollable = require("./scrollable")
var viewport = require("./viewport")

var position = {}
module.exports = position
position.offset = offsetPosition
position.viewport = viewportPosition

function offsetPosition( el ){
  var parent = el
    , left = 0
    , top = 0
  while ( parent && parent.offsetLeft != undefined && parent.offsetTop != undefined ) {
    left += parent.offsetLeft
    top += parent.offsetTop
    parent = parent.parentNode
  }
  return {
    top: top,
    left: left,
    right: left + el.offsetWidth,
    bottom: top + el.offsetHeight,
    height: el.offsetHeight,
    width: el.offsetWidth
  }
}

function viewportPosition( el ){
  var scrollable = getScrollable()
    , position = offsetPosition(el)
    , viewPort = viewport()
    , viewPortCenterY = (viewPort.height / 2) >> 0
    , viewPortCenterX = (viewPort.width / 2) >> 0
    , elementCenterY = (position.height / 2) >> 0
    , elementCenterX = (position.width / 2) >> 0

    , topFromTop = position.top - scrollable.scrollTop
    , topFromCenter = topFromTop - viewPortCenterY
    , topFromBottom = topFromTop - viewPort.height

    , bottomFromTop = topFromTop + position.height
    , bottomFromCenter = topFromCenter + position.height
    , bottomFromBottom = topFromBottom + position.height

    , leftFromLeft = position.left - scrollable.scrollLeft
    , leftFromCenter = leftFromLeft - viewPortCenterX
    , leftFromRight = leftFromLeft - viewPort.width

    , rightFromLeft = leftFromLeft + position.width
    , rightFromCenter = leftFromCenter + position.width
    , rightFromRight = leftFromRight + position.width

    , centerFromCenterY = topFromCenter + elementCenterY
    , centerFromCenterX = leftFromCenter + elementCenterX

  return {
    topFromTop: topFromTop,
    topFromCenter: topFromCenter,
    topFromBottom: topFromBottom,
    leftFromLeft: leftFromLeft,
    leftFromCenter: leftFromCenter,
    leftFromRight: leftFromRight,
    rightFromLeft: rightFromLeft,
    rightFromCenter: rightFromCenter,
    rightFromRight: rightFromRight,
    bottomFromTop: bottomFromTop,
    bottomFromCenter: bottomFromCenter,
    bottomFromBottom: bottomFromBottom,
    centerFromCenterY: centerFromCenterY,
    centerFromCenterX: centerFromCenterX
  }
}

Role.extend({
  offsetPosition: function (){
    return offsetPosition(this.element)
  },
  viewportPosition: function (){
    return viewportPosition(this.element)
  }
})

