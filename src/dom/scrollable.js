/* hive.scrollable */
var cached
module.exports = scrollable
function scrollable( eventTarget ){
  if ( cached ) return cached
  eventTarget = eventTarget || document.body
  // get the actually scrollable element
  if ( !eventTarget.nodeName || !!~[
    "iframe", "#document", "html", "body"
  ].indexOf(eventTarget.nodeName.toLowerCase()) ) {
    var doc = (eventTarget.contentWindow || eventTarget).document || eventTarget.ownerDocument || eventTarget
    eventTarget = /webkit/i.test(navigator.userAgent) || doc.compatMode == "BackCompat"
      ? doc.body
      : doc.documentElement
  }
  return cached = eventTarget
}