/* hive.dom.boxModel */

var Role = require("../core/Role")
var style = require("./style")

module.exports = boxModel

function boxModel( element ){
  var box = {}
  box.width = element.offsetWidth
  box.height = element.offsetHeight
  box.paddingLeft = parseInt(style(element, "padding-left"))
  box.paddingRight = parseInt(style(element, "padding-right"))
  box.paddingTop = parseInt(style(element, "padding-top"))
  box.paddingBottom = parseInt(style(element, "padding-bottom"))
  box.paddingWidth = box.width
    + box.paddingLeft
    + box.paddingRight
  box.paddingHeight = box.height
    + box.paddingTop
    + box.paddingBottom
  box.borderLeft = parseInt(style(element, "border-left"))
  box.borderRight = parseInt(style(element, "border-right"))
  box.borderTop = parseInt(style(element, "border-top"))
  box.borderBottom = parseInt(style(element, "border-bottom"))
  box.borderWidth = box.paddingWidth
    + box.borderLeft
    + box.borderRight
  box.borderHeight = box.paddingHeight
    + box.borderTop
    + box.borderBottom
  box.marginLeft = parseInt(style(element, "border-left"))
  box.marginRight = parseInt(style(element, "margin-right"))
  box.marginTop = parseInt(style(element, "margin-top"))
  box.marginBottom = parseInt(style(element, "margin-bottom"))
  box.marginWidth = box.paddingWidth
    + box.marginLeft
    + box.marginRight
  box.marginHeight = box.paddingHeight
    + box.marginTop
    + box.marginBottom
  return box
}

Role.extend({
  boxModel: function (){
    return boxModel(this.element)
  }
})