

/**
 *
 * @param {Node} element The node you want to get the map of.
 * @returns {Object}
 */
module.exports.getAttributeMap = function(element) {
  var attrs = element._attributes._nodes;
  var obj = {};

  for (var name in attrs) {
    // fix for style attribute
    if (name === 'style') {
      obj[name] = element._style;
    } else {
      if (attrs[name]._nodeValue) {
        obj[name] = attrs[name]._nodeValue;
      } else {
        obj[name] = true;
      }
    }
  }

  return obj;
};